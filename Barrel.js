var editor = null;
var simulator = null;
var nodeTable = null;

var mProt = null;
var csar = null;

var nodeTypeSelectorCallback = function (name) {
    var onend = function () {
        var doc = csar.getTypeDocuments()[name];
        mProt = new ManagementProtocol.ManagementProtocolEditor(doc, name);
        editor.setState({ name: name, mProt: mProt });
        editor.refreshMProt();
    };

    return function () {
        if (mProt != null)
            mProt.save(onend);
        else
            onend();
    };
}

// NEW FUNCTIONS ///////////////////////////////////////////////////

// JointJS shape for drawing a "topology node"

/* This function builds a JointJS environment where to draw a graph.
 * Inputs:
 * - "parentElement" -> DOM element inside of which the environment has to be created
 * - "width" -> width (in pixels) of the environment to create
 * - "height" -> height (in pixels) of the environment to create
 * Returns:
 * - A map with the created "joint.dia.Paper" and "joint.dia.Graph" elements
 */
function createGraph(parentElement, width, height) {
    // Create the "joint.dia.Graph" to be returned
    var graph = new joint.dia.Graph();

    // Create a "joint.dia.Paper" environment (inside "parentElement") where to place the graph
    var paper = new joint.dia.Paper({
        el: parentElement,
        width: width,
        height: height,
        model: graph
    });

    // Avoid inner elements to overflow the environment
    paper.on('cell:pointermove', function (cellView, evt, x, y) {
        var cell = cellView.getBBox();
        var constrained = false;

        var constrainedX = x;
        if (cell.x <= 0) { constrainedX = x + 1; constrained = true }
        if (cell.x + cell.width >= width) { constrainedX = x - 1; constrained = true }

        var constrainedY = y;
        if (cell.y <= 0) { constrainedY = y + 1; constrained = true }
        if (cell.y + cell.height >= height) { constrainedY = y - 1; constrained = true }

        if (constrained) { cellView.pointermove(evt, constrainedX, constrainedY) }
    });

    // Return the created "joint.dia.Graph"
    return { graph: graph, paper: paper };
}

/*
 * This function draws the current application's topology.
 * Inputs:
 * - "parentDiv" -> HTMLElement where to draw the application topology
 * - "topology" -> TOSCAAnalysis.UIData<Analysis.Application> representing the application topology
 */
function drawTopology(parentDiv, topology) {
    // Clean the content of the "parentDiv"
    parentDiv.innerHTML = ""

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

    // Attaching handler (exploiting the above map)
    env.paper.on('cell:pointerdblclick', function (cellView, evt, x, y) {
        var nType = cellView.model.nodeType;
        if (nType) nodeTypeSelectorCallback(nType);
    });

    // Layout the graph as a DAG
    joint.layout.DirectedGraph.layout(env.graph, {
        nodeSep: 50,
        edgeSep: 80,
        rankDir: "TB"
    });
}

/*
 * This function is a wrapper for "Simulator.build" and permits (re)building the "Simulator" pane from scratch.
 */
function buildSimulator() {
    return;
    var uiData = TOSCAAnalysis.serviceTemplateToApplication(csar.get("ServiceTemplate")[0].element, csar.getTypes());
    Simulator.build($("#simulator-body")[0], uiData);
}

////////////////////////////////////////////////////////////////////

var onCsarRead = function () {
    var serviceTemplate = csar.get("ServiceTemplate")[0].element;
    var types = csar.getTypes();
    var topology = TOSCAAnalysis.serviceTemplateToApplication(serviceTemplate, types);

    $(".hidden").removeClass("hidden");
    $("[href='#visualiser']").click();

    // !-------------------------!
    // !       VISUALISER        !
    // !-------------------------!
    var appName = "Unnamed";
    if (serviceTemplate.hasAttribute("name"))
        appName = serviceTemplate.getAttribute("name");
    $("#application-name")[0].innerHTML = appName;
    //$("#topology-table-body")[0].innerHTML = TOSCAAnalysis.uiApplicationToElement(topology);
    nodeTable.setUIData(topology);
    drawTopology($("#app-topology")[0], topology);

    // !-------------------------!
    // !         EDITOR          !
    // !-------------------------!

    var first = true;

    // Handle click on rows by opening the corresponding management protocol editor
    for (var name in types) {
        var onclick = nodeTypeSelectorCallback(name);
        $(".row-" + name).click(onclick);

        // Initialise editor to display the management protocol of the first processed node
        if (first) {
            onclick();
            first = false;
        }
    }

    // !-------------------------!
    // !        SIMULATOR        !
    // !-------------------------!
    simulator.setUIData(topology);

    // !-------------------------!
    // !        ANALYSER         !
    // !-------------------------!
    // TODO!!!!!!!!!!!!!!
}
