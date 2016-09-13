var SimulatorNodeCapabilities = React.createClass({
  render: function() {
    var caps = Object.keys(this.props.caps);
    return (
      <td> {
        caps.map(function (capId) {
          return (
            <div className="btn btn-xs btn-success disabled">
              {this.props.getUIName(capId)}
            </div>
          );
        })
      }</td>
    );
  }
});

var SimulatorNodeRequirements = React.createClass({
  render: function() {
    var reqs = Object.keys(this.props.reqs);
    var isFault = (reqId) => this.props.faults[reqId] || false;
    return (
      <td> {
        reqs.map(function(reqId) {
          if(isFault(reqId))
            return (
              <div className="btn btn-xs sim-req btn-danger" onClick={this.simulator.handleFault(this.props.nodeId,reqId)}>
                {this.props.getUIName(reqId)}
              </div>
            );
          else
            return (
              <div className="btn btn-xs btn-success disabled">
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
        ops.map(function (opId) {
          return (
            <div
              className={this.simulator.canPerformOp(nodeId,opId) ? "btn btn-xs btn-success" : "btn btn-xs btn-warning"}
              onClick={() => this.props.simulator.performOp(this.props.nodeId, opId)}
            >
              {this.props.getUIName(opId)}
            </div>
          );
        })
      }</td>
    );
  }
});

var SimulatorNode = React.createClass({
  render: function() {
    return (
      <tr>
        <td>{this.props.getUIName(this.props.nodeId)}</td>
        <td>{this.props.getUIName(this.props.node.stateId)}</td>
        <SimulatorNodeCapabilities
          caps={this.props.node.state.caps}
          getUIName={this.props.getUiName}
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
          simulator={this.props.simulator}
        />
      </tr>
    );
  }
})

var Simulator = React.createClass({
  getInitialState: function() {
    return { app: this.props.initialApp };
  },
  canPerformOp: function(nodeId,opId) {
    this.setState(this.state.app.canPerformOp(nodeId,opId))
  },
  performOp: function(nodeId,opId) {
    this.setState(this.state.app.performOp(nodeId,opId))
  },
  handleFault: function(nodeId,reqId) {
    this.setState(this.state.app.handleFault(nodeId,reqId))
  },
  render: function() {
    var getUIName = id => this.props.uiNames[id] || id;
    var nodes = this.state.app.nodes;
    var nodeIds = Object.keys(nodes);
    return (
      <div>
        <table className="table table-striped table-hover ">
          <thead>
            <tr>
              <th style="width:10%"></th>
              <th style="width:10%">State</th>
              <th style="width:25%">Offered capabilities</th>
              <th style="width:25%">Assumed requirements</th>
              <th style="width:30%">Available operations</th>
            </tr>
          </thead>
          <tbody id="simulator-body">{
            nodeIds.map(function (nId) {
              return (
                <SimulatorNode
                  nodeId={nId}
                  node={nodes[nId]}
                  getUIName={getUIName}
                  simulator={this}
                />
              )
            })
          }
          </tbody>
        </table>
        <div className="form-horizontal col-lg-10 hidden" style="text-align:center">
          <button type="button" className="btn btn-default btn-xs" onClick={() => this.setState(this.getInitialState())}>
            Clear
          </button>
        </div>
      </div>
    );
  }
});

//simulator = ReactDOM.render(<Simulator initialApp={uiData.data} uiNames={uiData.uiNames} />, document.getElementById('simulator'));
