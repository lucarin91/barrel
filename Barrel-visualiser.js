var TopologyRow = React.createClass({
  render: function() {
    return (<tr>
      <td>{this.props.name}</td>
      <td>{this.props.type}</td>
      <td>{this.props.caps}</td>
      <td>{this.props.reqs}</td>
      <td>{this.props.ops}</td>
    </tr>);
  }
})

var TopologyTable = React.createClass({
  render: function() {
		// Setting the stage
    var getUIName = id => this.props.uiData.uiNames[id] || id;
		var setToList = set => Object.keys(set).map(getUIName).join("<br>");

		var nodes = this.props.uiData.data.nodes;
		var nodeIds = Object.keys(nodes);

		// Rendering
		return (
      <table className="table table-striped table-hover hidden">
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
          nodeIds.map(id =>
            <TopologyRow
              key={id}
              name={getUIName(id)}
              type={nodes[id].type}
              caps={setToList(nodes[id].caps)}
              reqs={setToList(nodes[id].reqs)}
              ops={setToList(nodes[id].ops)} />
          )
      	}
        </tbody>
    </table>
  );
 }
});

//nodeTable = ReactDOM.render(<TopologyTable />, document.getElementById('topology-table-body'));
