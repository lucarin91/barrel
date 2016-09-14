var TopologyRow = React.createClass({
  render: function() {
    var renderSet = set => {
      var els = Object.keys(set);
      return els.map(el => (<span key={el}>{this.props.getUIName(el)}<br /></span>))
    }
    return (<tr>
      <td><b>{this.props.name}</b></td>
      <td>{this.props.type}</td>
      <td>{renderSet(this.props.caps)}</td>
      <td>{renderSet(this.props.reqs)}</td>
      <td>{renderSet(this.props.ops)}</td>
    </tr>);
  }
})

var TopologyTable = React.createClass({
  getInitialState: function() { return { uiData: null } },
  setUIData: function(uiData) {
    this.setState({ uiData: uiData })
  },
  render: function() {
    if (this.state.uiData) {
      console.log(this.state.uiData);
  		// Setting the stage
      var getUIName = id => this.state.uiData.uiNames[id] || id;

  		var nodes = this.state.uiData.data.nodes;
  		var nodeIds = Object.keys(nodes);

  		// Rendering
  		return (
        <table className="table table-striped table-hover">
          <thead>
              <tr className="btn-primary disabled">
                  <th>Node</th>
                  <th>Node type</th>
                  <th>Capabilities</th>
                  <th>Requirements</th>
                  <th>Operations</th>
              </tr>
          </thead>
          <tbody> {
            nodeIds.map(id => {
              return (
                <TopologyRow
                  key={id}
                  getUIName={getUIName}
                  name={getUIName(id)}
                  type={nodes[id].type}
                  caps={nodes[id].caps}
                  reqs={nodes[id].reqs}
                  ops={nodes[id].ops} />
              )
            })
        	}
          </tbody>
      </table>
    );
  }
  else
    return null;
 }
});

nodeTable = ReactDOM.render(<TopologyTable />, document.getElementById('topology-table'));
