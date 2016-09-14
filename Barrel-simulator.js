var SimulatorNodeCapabilities = React.createClass({
  render: function() {
    var caps = Object.keys(this.props.caps);
    return (
      <td> {
        caps.map(capId => (
            <div
              key={capId}
              className="btn btn-xs btn-success disabled">
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
          var className="btn btn-xs "
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
              className={this.props.simulator.canPerformOp(this.props.nodeId,opId) ? "btn btn-xs btn-success" : "btn btn-xs btn-warning disabled"}
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
        <td><b>{this.props.getUIName(this.props.nodeId)}</b></td>
        <td>{this.props.getUIName(this.props.node.stateId)}</td>
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
  render: function() {
    var getUIName = id => this.props.uiNames[id] || id;
    var nodes = this.state.app.nodes;
    var nodeIds = Object.keys(nodes);
    return (
      <div>
        <table className="table table-striped table-hover">
          <thead>
            <tr>
              <th style={{width:"10%"}}></th>
              <th style={{width:"10%"}}>State</th>
              <th style={{width:"25%"}}>Offered capabilities</th>
              <th style={{width:"25%"}}>Assumed requirements</th>
              <th style={{width:"30%"}}>Available operations</th>
            </tr>
          </thead>
          <tbody id="simulator-body">{
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
          <button type="button" className="btn btn-default btn-xs" onClick={() => this.setState(this.getInitialState())}>
            Clear
          </button>
        </div>
      </div>
    );
  }
});

var Simulator = React.createClass({
  getInitialState: function() {
    return { uiData: null };
  },
  setUIData: function(uiData) {
    this.setState({uiData: uiData});
  },
  render: function() {
    if (this.state.uiData)
      return ( <SimulatorTable initialApp={this.state.uiData.data} uiNames={this.state.uiData.uiNames} /> );
    else
      return null;
  }
});

simulator = ReactDOM.render(<Simulator />, document.getElementById('simulator'));
