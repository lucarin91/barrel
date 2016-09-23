var SimulatorNodeName = React.createClass({
  render: function() {
    return (
      <td>
        <b>{this.props.getUIName(this.props.nodeId)}</b>
      </td>
    );
  }
})

var SimulatorNodeState = React.createClass({
  render: function() {
    return (
      <td>
        {this.props.getUIName(this.props.stateId)}
        {" "}
        <SimulatorHardReset
          nodeId={this.props.nodeId}
          stateId={this.props.stateId}
          simulator={this.props.simulator}
        />
      </td>
    );
  }
})

var SimulatorHardReset = React.createClass({
  render: function() {
    if (!this.props.simulator.canHardReset(this.props.nodeId) ||
        this.props.simulator.isInitialState(this.props.nodeId,this.props.stateId))
      return null;
    return (
      <div
        className="btn btn-sm btn-danger"
        onClick={() => {this.props.simulator.hardReset(this.props.nodeId)}}>
        Hard recover
      </div>
    );
  }
})

var SimulatorNodeCapabilities = React.createClass({
  render: function() {
    var caps = Object.keys(this.props.caps);
    return (
      <td> {
        caps.map(capId => (
            <div
              key={capId}
              className="btn btn-sm btn-success disabled">
              {this.props.getUIName(capId)}
            </div>
          )
        )
      }</td>
    );
  }
});

var SimulatorNodeRequirements = React.createClass({
  render: function() {
    var reqs = Object.keys(this.props.reqs);
    var isFault = reqId => this.props.faults[reqId] || false;
    return (
      <td> {
        reqs.map(reqId => {
          var className="btn btn-sm "
          if(isFault(reqId)) {
            className+="btn-danger "
            if(!this.props.simulator.canHandleFault(this.props.nodeId,reqId)) className+="disabled ";
          }
          else className+="btn-success disabled ";
          return (
              <div
                key={reqId}
                className={className}
                onClick={() => this.props.simulator.handleFault(this.props.nodeId,reqId)}>
                {this.props.getUIName(reqId)}
              </div>
          );
        })
      }</td>
    );
  }
});

var SimulatorNodeOperations = React.createClass({
  render: function() {
    var ops = Object.keys(this.props.ops);
    return (
      <td> {
        ops.map(opId => (
            <div
              key={opId}
              className={this.props.simulator.canPerformOp(this.props.nodeId,opId) ? "btn btn-sm btn-success" : "btn btn-sm btn-warning disabled"}
              onClick={() => this.props.simulator.performOp(this.props.nodeId, opId)}
            >
              {this.props.getUIName(opId)}
            </div>
          )
        )
      }</td>
    );
  }
});

var SimulatorNode = React.createClass({
  render: function() {
    return (
      <tr>
        <SimulatorNodeName
          nodeId={this.props.nodeId}
          getUIName={this.props.getUIName}
        />
        <SimulatorNodeState
          nodeId={this.props.nodeId}
          stateId={this.props.node.stateId}
          getUIName={this.props.getUIName}
          simulator={this.props.simulator}
        />
        <SimulatorNodeCapabilities
          caps={this.props.node.state.caps}
          getUIName={this.props.getUIName}
        />
        <SimulatorNodeRequirements
          nodeId={this.props.nodeId}
          reqs={this.props.node.state.reqs}
          faults={this.props.faults}
          getUIName={this.props.getUIName}
          simulator={this.props.simulator}
        />
        <SimulatorNodeOperations
          nodeId={this.props.nodeId}
          ops={this.props.node.state.ops}
          getUIName={this.props.getUIName}
          simulator={this.props.simulator}
        />
      </tr>
    );
  }
})

var SimulatorTable = React.createClass({
  getInitialState: function() {
    return { app: this.props.initialApp };
  },
  componentWillReceiveProps: function(nextProps) {
    this.setState({ app: nextProps.initialApp });
  },
  isInitialState: function(nodeId,stateId) {
    return (this.state.app.nodes[nodeId].initialState==stateId);
  },
  canPerformOp: function(nodeId,opId) {
    return this.state.app.canPerformOp(nodeId,opId);
  },
  performOp: function(nodeId,opId) {
    this.setState({ app: this.state.app.performOp(nodeId,opId)});
  },
  canHandleFault: function(nodeId,reqId) {
    return this.state.app.canHandleFault(nodeId,reqId);
  },
  handleFault: function(nodeId,reqId) {
    this.setState({ app: this.state.app.handleFault(nodeId,reqId)})
  },
  canHardReset: function(nodeId) {
    return this.state.app.canHardReset(nodeId);
  },
  hardReset: function(nodeId) {
    this.setState({ app: this.state.app.doHardReset(nodeId) })
  },
  render: function() {
    var getUIName = id => this.props.uiNames[id] || id;
    var nodes = this.state.app.nodes;
    var nodeIds = Object.keys(nodes);
    console.log(this.state.app)
    return (
      <div>
        <h1>Simulator</h1>
        <table className="table table-striped simulator-table">
          <thead>
            <tr className="success">
              <th></th>
              <th>State</th>
              <th>Offered capabilities</th>
              <th>Assumed requirements</th>
              <th>Available operations</th>
            </tr>
          </thead>
          <tbody>{
            nodeIds.map(nId => {
              return (
                <SimulatorNode
                  key={"simnode-"+nId}
                  nodeId={nId}
                  node={nodes[nId]}
                  faults={this.state.app.faults}
                  getUIName={getUIName}
                  simulator={this}
                />
              )
            })
          }
          </tbody>
        </table>
        <div className="form-horizontal col-lg-10" style={{textAlign:"center"}}>
          <button type="button" className="btn btn-default btn-sm" onClick={() => this.setState(this.getInitialState())}>
            Reset simulator
          </button>
        </div>
      </div>
    );
  }
});

Simulator = React.createClass({
  render: function() {
      return <SimulatorTable initialApp={this.props.uiData.data} uiNames={this.props.uiData.uiNames} />;
  }
});
