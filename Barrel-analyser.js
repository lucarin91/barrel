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
      if (!step.opId) return (
        <p key={"step-"+step.nodeId+"--"}>
          <span className="label label-default">Hard recover</span>
          {" Node "}
          <b>{this.props.getUIName(step.nodeId)}</b>
          {" is now hard recovered to its initial state."}
        </p>
      );
      else if (step.isOp) return (
        <p key={"step-"+step.nodeId+"-"+step.opId}>
          <span className="label label-primary">Operation</span>
          {" Execute operation "}
          <b>{this.props.getUIName(step.opId)}</b>
          {" on node "}
          <b>{this.props.getUIName(step.nodeId)}</b>
        </p>
      )
      else return (
        <p key={"step-"+step.nodeId+"-"+step.opId}>
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

if (!!window.Worker){
  console.log('Use web worker to update plans');
  var PlanWorker = new Worker("worker.js");
}else{
  console.log('Cannot use web worker to update plans');
}

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
  findPlan: function(plans) {
    var fromStateToString = gs => Object.keys(gs).map(s => s + "=" + gs[s]).join("|");

    var start = fromStateToString(this.state.start);
    var target = fromStateToString(this.state.target);

    var result = {
      isStartReachable: start in this.props.reachable,
      isTargetReachable: target in this.props.reachable,
      plan: null
    };
    if(result.isStartReachable &&
        result.isTargetReachable &&
        plans.costs[start][target]>=0) {
      result.plan = [];
      var currentApp = this.props.reachable[start];
      while(currentApp.globalState != target) {
        var step = plans.steps[currentApp.globalState][target];
        result.plan.push(step);
        if (!step.opId) currentApp = currentApp.doHardReset(step.nodeId);
        else if (step.isOp) currentApp = currentApp.performOp(step.nodeId,step.opId);
        else currentApp = currentApp.handleFault(step.nodeId,step.opId);
      }
    }
    return result;
  },
  updatePlan(uiData) {
    uiData = uiData||this.props.uiData;
    this.setState({plans: null});
    if (!!window.Worker){
      // send message to web worker
      PlanWorker.postMessage(uiData);
      // receive messages from web worker
      PlanWorker.onmessage = (e) => {
          var plans = e.data;
          this.setState({plans: plans});
          console.log('Update plans with worker!')
      };
    } else{
      var plans = Analysis.plans(uiData.data);
      this.setState({plans: plans});
      console.log('Update plans wihout worker!')
    }

  },
  componentWillMount() {
    this.updatePlan();
  },
  componentWillReceiveProps(nextProps){
    var shouldUpdate = !Object.is(nextProps.uiData, this.props.uiData);
    if (shouldUpdate)
      this.updatePlan(nextProps.uiData);
  },
  render: function() {
    var plan = this.state.plans ? this.findPlan(this.state.plans) : null;
    return (
      <div>
        <h1 className="bolded">Planner</h1>
        {!plan &&
          <img src="img/loading.svg" className="center-block" style={{marginTop: "50px", marginBottom: "50px"}}/>}
        {plan &&
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
              <div style={{textAlign: "center"}}>
                <a className="btn btn-sm btn-default" onClick={() => this.props.setSimulatorState(this.state.start)}>Set as simulator state</a>
              </div>
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
              <div style={{textAlign: "center"}}>
                <a className="btn btn-sm btn-default" onClick={() => this.props.setSimulatorState(this.state.target)}>Set as simulator state</a>
              </div>
            </div>
            <PlannerResult
              plan={plan}
              getUIName={this.props.getUIName} />
          </div>
        }
      </div>
    );
  }
})

Analyser = React.createClass({
  getInitialState: function() {
    return {
      simulatorApp: this.props.uiData.data
    };
  },
  resetSimulatorState: function() {
    this.setState({
      simulatorApp: this.props.uiData.data
    });
  },
  setSimulatorState: function(gs) {
    var fromStateToString = gs => Object.keys(gs).map(s => s + "=" + gs[s]).join("|");

    var desiredState = fromStateToString(gs);

    if (desiredState in this.props.reachable)
      this.setState({
        simulatorApp: this.props.reachable[desiredState]
      });
  },
  componentWillReceiveProps(nextProps){
    console.log('Analyser will receive new props')
    this.setState({
      simulatorApp: nextProps.uiData.data
    });
  },
  render: function() {
    console.log('render Analyser')
    var getUIName = id => this.props.uiData.uiNames[id] || id;
    var nodeSetToNodeList = set => Object.keys(set).map(el => { return { name: el, obj: set[el] } });

    return (
      <div>
        <Simulator
          app={this.state.simulatorApp}
          uiNames={this.props.uiData.uiNames}
          resetSimulator={this.resetSimulatorState} />
        <br />
        <Planner
          initialGlobalState={this.props.uiData.data.globalState}
          nodes={nodeSetToNodeList(this.props.uiData.data.nodes)}
          reachable={this.props.reachable}
          uiData={this.props.uiData}
          getUIName={getUIName}
          setSimulatorState={this.setSimulatorState}
        />
      </div>
    )
  }
})
