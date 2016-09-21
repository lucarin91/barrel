var StateSelector = React.createClass({
  render: function() {
    var updateGlobalState = evt => {
      var nodeId = evt.target.value.split("=")[0];
      var stateId = evt.target.value.split("=")[1];
      this.props.updateGlobalState(nodeId,stateId,this.props.isStartSelector)
    }
    var makeNodeRow = node => {
      var val = node.name+"="+this.props.globalState[node.name]
      return (
        <tr key={"row-"+node.name+"-"+this.props.isStartSelector}>
          <td>
            <b>{this.props.getUIName(node.name)}</b>
          </td>
          <td>
            <select
              id={"state-selector-"+node.name+"-"+this.props.isStartSelector}
              className="form-control"
              value={val}
              onChange={updateGlobalState}>
              {Object.keys(node.obj.states).map(v =>
                <option key={v+"-"+this.props.isStartSelector} value={node.name+"="+v}>{v}</option>
              )}
            </select>
          </td>
        </tr>
      )
    }
    return (
      <table className="table table-striped analyser-text">
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
    );
  }
});

var StateReachability = React.createClass({
  render: function() {
    if(!this.props.isReachable) return (
      <div className="alert alert-danger">
        <p>The above <b>state is unreachable</b> from the initial global state.</p>
      </div>
    )
    else return (
      <div className="well">
        <p>The above <b>state is reachable</b> from the initial global state.</p>
      </div>
    )
  }
})

var PlannerResult = React.createClass({
  render: function() {
    var renderStep = step => {
      if (step.isOp) return (
        <p key={"step-"+step.nodeId+"-"+step.opId}>
          <span className="label label-primary">Operation</span>
          {" Execute operation "}
          <b>{this.props.getUIName(step.opId)}</b>
          {" on node "}
          <b>{this.props.getUIName(step.nodeId)}</b>
        </p>
      )
      else return (
        <p key={"step-"+step.opId}>
          <span className="label label-default">Fault handler</span>
          {" Handle fault of "}
          <b>{this.props.getUIName(step.opId)}</b>
          {" on node "}
          <b>{this.props.getUIName(step.nodeId)}</b>
        </p>
      )
    }
    if(!this.props.plan.isStartReachable || !this.props.plan.isTargetReachable)
      return null;
    if(this.props.plan.plan == null)
      return (
        <p className="alert alert-warning">
          Target state is unreachable from the starting state (despite they are both reachable from the initial global state).
        </p>
      )
    if(this.props.plan.plan.length == 0)
      return (
        <div className="well">
          <p>Start and target states do coincide</p>
        </div>
      )
    return (
      <div className="well">
        <p>
          The <b>target state</b> can be reached from the <b>starting state</b> as follows:
        </p>
        {this.props.plan.plan.map(renderStep)}
      </div>
    )
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
  switchState: function() {
    this.setState({
      start: this.state.target,
      target: this.state.start
    })
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
        <h1 className="bolded">Planner</h1>
        <div className="form-group">
          <div className="analyser-align">
            <h4 className="bolded">Starting global state</h4>
            <StateSelector
              nodes={this.props.nodes}
              getUIName={this.props.getUIName}
              globalState={this.state.start}
              isStartSelector={true}
              updateGlobalState={this.updateGlobalState} />
            <StateReachability isReachable={plan.isStartReachable} />
          </div>
          <div className="analyser-align">
            <a className="btn btn-sm btn-default" onClick={this.switchState}>Switch states</a>
          </div>
          <div className="analyser-align">
            <h4 className="bolded">Target global state</h4>
            <StateSelector
              nodes={this.props.nodes}
              getUIName={this.props.getUIName}
              globalState={this.state.target}
              isStartSelector={false}
              updateGlobalState={this.updateGlobalState} />
            <StateReachability isReachable={plan.isTargetReachable} />
          </div>
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
