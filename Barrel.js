var editor = null;
var simulator = null;
var visualiser = null;

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
    visualiser.update(appName,topology);

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
