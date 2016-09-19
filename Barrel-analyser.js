var StateSelector = React.createClass({
  componentDidUpdate: function () {
    Object.keys(this.props.globalState).map(node => {
      $("#state-selector-"+node+"-"+this.props.isStartSelector)[0].value =
        node+"="+this.props.globalState[node];
    });
  },
  render: function() {
    var updateGlobalState = evt => {
      var nodeId = evt.target.value.split("=")[0];
      var stateId = evt.target.value.split("=")[1];
      this.props.updateGlobalState(nodeId,stateId,this.props.isStartSelector)
    }
    var makeNodeRow = node => (
      <tr key={this.props.caption.replace(" ","-")+"-"+node.name}>
        <td>
          {this.props.getUIName(node.name)}
        </td>
        <td>
          <select
            id={"state-selector-"+node.name+"-"+this.props.isStartSelector}
            className="form-control"
            onChange={updateGlobalState}>
            {Object.keys(node.obj.states).map(v =>
              <option key={v+"-"+this.props.isStartSelector} value={node.name+"="+v}>{v}</option>
            )}
          </select>
        </td>
      </tr>
    )
    return (
      <div style={{display:"inline-block",paddingRight:"15px"}}>
        <h4 className="bolded">{this.props.caption}</h4>
        <table className="table table-striped">
          <thead>
            <tr className="success">
              <th>Node</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {this.props.nodes.map(makeNodeRow)}
          </tbody>
        </table>
      </div>
    );
  }
});

var PlannerResult = React.createClass({
  render: function() {
    console.log(this.props.plan.plan)
    var renderStep = step => step.nodeId+"."+step.opId + " "
    if(!this.props.plan.isStartReachable) return (
        <div className="alert alert-danger">
          <strong>Starting state is unreachable</strong>{" from the initial global state"}.
        </div>
    )
    if(!this.props.plan.isTargetReachable) return (
        <div className="alert alert-danger">
          <strong>Target state is unreachable</strong>{" from the initial global state"}.
        </div>
    )
    if(this.props.plan.plan == null) return (
      <div className="alert alert-warning">
        <strong>Target state is unreachable from the starting state</strong>{" (despite they are both reachable from the initial global state)"}.
      </div>
    )
    if(this.props.plan.plan.length>0) return (
      <div className="alert alert-success">
        <strong>
          Target state is reachable from the starting state
        </strong>
        {" "}
        by executing the following sequence of operations:
        {this.props.plan.plan.map(renderStep)}
      </div>
    )
    return null;
  }
});

var Planner = React.createClass({
  getInitialState: function () {
    var startGS = {};
    var targetGS = {};
    this.props.initialGlobalState.split("|").forEach(state => {
      var s = state.split("=");
      startGS[s[0]]=targetGS[s[0]]=s[1];
    });
    return {
      start: startGS,
      target: targetGS
    };
  },
  updateGlobalState: function(nodeId,stateId,isStart) {
    if(isStart) this.state.start[nodeId] = stateId;
    else this.state.target[nodeId] = stateId;
    this.setState({
        start: this.state.start,
        target: this.state.target
    });
  },
  findPlan: function() {
    var fromStateToString = gs => {
      var globalState = [];
      Object.keys(gs).map(s => globalState.push(s + "=" + gs[s]));
      return globalState.join("|");
    }
    var start = fromStateToString(this.state.start);
    var target = fromStateToString(this.state.target);

    var result = {
      isStartReachable: this.props.reachable[start]?true:false,
      isTargetReachable: this.props.reachable[target]?true:false,
      plan: null
    };
    if(result.isStartReachable &&
        result.isTargetReachable &&
        this.props.plans.costs[start][target]>=0) {
      result.plan = [];
      var currentApp = this.props.reachable[start];
      while(currentApp.globalState != target) {
        var step = this.props.plans.steps[currentApp.globalState][target];
        result.plan.push(step);
        if (step.isOp) currentApp = currentApp.performOp(step.nodeId,step.opId);
        else currentApp = currentApp.handleFault(step.nodeId,step.opId);
      }
    }
    return result;
  },
  render: function() {
    var plan = this.findPlan();
    return (
      <div>
        <h1 className="legend bolded">Planner</h1>
        <div className="form-group">
          <StateSelector
            caption="Starting global state"
            nodes={this.props.nodes}
            getUIName={this.props.getUIName}
            globalState={this.state.start}
            isStartSelector={true}
            updateGlobalState={this.updateGlobalState} />
          <StateSelector
            caption="Target global state"
            nodes={this.props.nodes}
            getUIName={this.props.getUIName}
            globalState={this.state.target}
            isStartSelector={false}
            updateGlobalState={this.updateGlobalState} />
          <PlannerResult
            plan={plan}
            getUIName={this.props.getUIName} />
        </div>
      </div>
    );
  }
})

Analyser = React.createClass({
  render: function() {
    var getUIName = id => this.props.uiData.uiNames[id] || id;
    var nodeSetToNodeList = set => Object.keys(set).map(el => { return { name: el, obj: set[el] } });

    return (
      <Planner
        initialGlobalState={this.props.uiData.data.globalState}
        nodes={nodeSetToNodeList(this.props.uiData.data.nodes)}
        reachable={Analysis.reachable(this.props.uiData.data)}
        plans={Analysis.plans(this.props.uiData.data)}
        getUIName={getUIName} />
    )
  }
})
