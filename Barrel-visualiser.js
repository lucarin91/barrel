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
  render: function() {
    if (!this.props.uiData) return null;
    // Setting the stage
    var getUIName = id => this.props.uiData.uiNames[id] || id;

  	var nodes = this.props.uiData.data.nodes;
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
});

var Visualiser = React.createClass({
  getInitialState: function () {
    return {
      appName: null,
      uiData: null
    }
  },
  update: function(appName,uiData) {
    this.setState({
      appName: appName,
      uiData: uiData
    })
  },
  render: function() {
    if(!this.state.uiData) return null;
    return (
      <div>
        <h1 className="legend" style={{textDecoration:"bold"}}>
          {this.state.appName}
        </h1>
        <h4>Application topology</h4>
        <table>
          <tr>
            <td style={{width:"40%"}}>
              <div id="app-topology" style={{position: "relative"}}></div>
            </td>
            <td style={{width:"60%"}}>
              <div style={{fontSize:"90%",marginLeft:"10px"}}>
                <TopologyTable uiData={this.state.uiData} />
              </div>
            </td>
          </tr>
        </table>
      </div>
    );
  },
  componentDidUpdate: function () {
    var drawTopology = function(parentDiv, topology) {
      // Parse the application topology
      var nodes = topology.data.nodes;
      var cells = {};

      var toUI = function (s) { return topology.uiNames[s] || s; };

      var TopologyNode = joint.shapes.basic.Generic.extend(_.extend({}, joint.shapes.basic.PortsModelInterface, {
        markup: '<g class="rotatable"><g class="scalable"><rect class="body"/></g><text class="label"/><g class="inPorts"/><g class="outPorts"/></g>',
        portMarkup: '<g class="port port<%= id %>"><circle class="port-body"/><text class="port-label"/></g>',
        defaults: joint.util.deepSupplement({
          type: 'devs.Model',
          size: { width: 1, height: 1 },
          inPorts: [],
          outPorts: [],
          attrs: {
            '.': { magnet: false },
            '.body': { width: 150, height: 50, 'rx': 10, 'ry': 5 },
            '.port-body': { r: 8, magnet: 'passive' },
            text: { 'pointer-events': 'none' },
            '.label': { text: 'Model', 'ref-x': .5, 'ref-y': 18, ref: '.body', 'text-anchor': 'middle' },
            '.inPorts .port-label': { x: 4, y: -9, 'text-anchor': 'start', transform: 'rotate(330)' },
            '.outPorts .port-label': { x: 1, y: 19, 'text-anchor': 'end', transform: 'rotate(330)' }
          }
        }, joint.shapes.basic.Generic.prototype.defaults),
        getPortAttrs: function (portName, index, total, selector, type) {
          var attrs = {};
          var portClass = 'port' + index;
          var portSelector = selector + '>.' + portClass;
          var portLabelSelector = portSelector + '>.port-label';
          var portBodySelector = portSelector + '>.port-body';
          attrs[portLabelSelector] = { text: toUI(portName) };
          attrs[portBodySelector] = { port: { id: portName || _.uniqueId(type), type: type } };
          attrs[portSelector] = { ref: '.body', 'ref-x': (index + 0.5) * (1 / total) };
          if (selector === '.outPorts') {
            attrs[portSelector]['ref-dy'] = 0;
          }
          return attrs;
        }
      }));

      // Create a new environment (see createGraph function definition)
      var env = createGraph(parentDiv, 400, 600);

      // Create a cell for each node
      for (var n in nodes) {
        var name = toUI(n);
        var caps = Object.keys(nodes[n].caps);
        var reqs = Object.keys(nodes[n].reqs);

        // Compute ad-hoc size for
        var nWidth = 20 + Math.max(
          Math.max(caps.length, reqs.length) * 20,
          name.length * 10);
        var nHeight = 50;

        // Create cells[n], and add it to env.graph
        cells[n] = new TopologyNode({
          size: { width: nWidth, height: nHeight },
          inPorts: caps,
          outPorts: reqs,
          attrs: { '.label': { text: name } }
        }).addTo(env.graph);

        // Replicate "type" information in "cell" to simplify double-click handling
        cells[n].nodeType = nodes[n].type
      }

      // Create connections among node cells according to the parsed topology
      for (var nodeId in nodes) {
        for (var req in nodes[nodeId].reqs) {
          var source = cells[nodeId];
          var sourcePort = req;
          var targetPort = topology.data.binding[req];
          var target = cells[topology.data.capNodeId[targetPort]];
          new joint.shapes.devs.Link({
            source: { id: source.id, selector: source.getPortSelector(sourcePort) },
            target: { id: target.id, selector: target.getPortSelector(targetPort) },
            smooth: true,
            attrs: { '.marker-target': { d: 'M 10 0 L 0 5 L 10 10 z' } }
          }).addTo(env.graph).reparent();
        }
      }

      // Layout the graph as a DAG
      joint.layout.DirectedGraph.layout(env.graph, {
        marginX: 50,
        marginY: 50,
        rankDir: "TB" });
    }
    drawTopology($("#app-topology")[0], this.state.uiData);
  }
});

visualiser = ReactDOM.render(<Visualiser />, document.getElementById('visualiser'));
