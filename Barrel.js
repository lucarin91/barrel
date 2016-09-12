var mProt = null;
var csar = null;
var csarFileName = null;

var fileInput = document.getElementById("file-input");

var nodeTypeSelectorCallback = function (name) {
    var onend = function () {
        var doc = csar.getTypeDocuments()[name];
        mProt = new ManagementProtocol.ManagementProtocolEditor(doc, name);
        drawEnvironment(name);
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
 * This function sets the reqs/caps flags of a management protocol state based on the editor status.
 */
function setStateVals() {
    var s = $("#modal-state-editor #state-editor-selector").val();
    var state = mProt.getStates()[s];
    var reqs = {};
    var caps = {};
    $("#modal-state-editor .req-checkbox").each(function () {
        if (this.checked) reqs[this.labels[0].textContent] = true;
    });
    $("#modal-state-editor .cap-checkbox").each(function () {
        if (this.checked) caps[this.labels[0].textContent] = true;
    });

    // Update management protocol
    state.setReqs(reqs);
    state.setCaps(caps);

    // Update UI
    for (var r in mProt.getReqs())
        deleteRequirementAssumption(s, r);

    for (var c in mProt.getCaps())
        deleteCapabilityOffering(s, c);

    for (var r in reqs)
        drawRequirementAssumption(s, r);

    for (var c in caps)
        drawCapabilityOffering(s, c);
}

/*
 * This function updates the reqs/caps flags of a state shown in the editor.
 */
function updateStateVals(s) {
    var state = mProt.getStates()[s];
    var reqs = state.getReqs();
    var caps = state.getCaps();
    $("#modal-state-editor .req-checkbox").each(function () {
        this.checked = reqs[this.labels[0].textContent] || false;
    });
    $("#modal-state-editor .cap-checkbox").each(function () {
        this.checked = caps[this.labels[0].textContent] || false;
    });
}

/*
 * This function fills the requirement selector in "modal-requirement/capability-editor".
 * Inputs:
 * - "mode" -> if "Add" the function fills the selector with the requirements/capability that can still be assumed/offered; if "Remove" it fills the selector with the requirements/capabilities that can be removed
 * - "what" -> if "capability" the function fills the selector with capability offerings; if "requirement" it fills the selector with requirement assumptions.
 */
function fillSelector(mode, what) {
    var selector = $("#" + what + "-selector")[0];
    // Clean "selector"
    selector.innerHTML = "";

    // Get the state to be edited
    var state = $("#" + what + "-state-selector")[0].value;

    // Get options (requirement/capabilities that can be added/removed) to fill the selector
    var opts;
    if (what == "requirement") {
        if (mode == 'Add') {
            opts = mProt.getReqs();
            var assumed = mProt.getState(state).getReqs()
            opts = $(opts).not(assumed).get()
        }
        else
            opts = mProt.getState(state).getReqs()
    }
    else if (what == "capability") {
        if (mode == 'Add') {
            opts = mProt.getCaps();
            var offered = mProt.getState(state).getCaps()
            opts = $(opts).not(offered).get()
        }
        else
            opts = mProt.getState(state).getCaps()
    }

    // If there are options to show
    if (opts.length > 0) {
        // Add an option for each of the above
        $("#" + what + "-selector").prop("disabled", false);
        $("#" + what + "-editor-confirm").prop("disabled", false);
        for (var o in opts) {
            var option = document.createElement("option");
            option.innerHTML = opts[o];
            selector.appendChild(option);
        }
    }
    else {
        // Disable the selector and the confirm button
        $("#" + what + "-selector").prop("disabled", true);
        $("#" + what + "-editor-confirm").prop("disabled", true);
    }
}

/*
 * This function adds/removes a requirement/capability to/from a state (by exploiting the information in "modal-requirement/capability-editor").
 * Inputs:
 * - "mode" -> if "Add"/"Remove", the function adds/removes a requirement/capability to/from a state.
 * - "what" -> if "requirement"/"capability", the function works on requirement assumptions/capability offerings
 */
function editState(mode, what) {
    // Get the pair state,requirement/capability from the selectors
    var stateName = $("#" + what + "-state-selector")[0].value;
    var whatName = $("#" + what + "-selector")[0].value;

    // Updates the selected "state" of the management protocol
    var state = mProt.getState(stateName);
    if (what == "requirement") {
        var reqs = state.getReqs();
        if (mode == 'Add') {
            // by adding the selected requirement "whatName"
            reqs.push(whatName);
            drawRequirementAssumption(stateName, whatName);
        }
        else {
            // by removing the selected requirement "whatName"
            reqs = $(reqs).not([whatName]).get();
            deleteRequirementAssumption(stateName, whatName)
        }
        state.setReqs(reqs);
    }
    else if (what == "capability") {
        var caps = state.getCaps();
        if (mode == 'Add') {
            // by adding the selected capability "whatName"
            caps.push(whatName);
            drawCapabilityOffering(stateName, whatName);
        }
        else {
            // by removing the selected capability "whatName"
            caps = $(caps).not([whatName]).get();
            deleteCapabilityOffering(stateName, whatName)
        }
        state.setCaps(caps);
    }

    buildSimulator();
}

/*
 * This function builds the "modal-transiton-editor".
 * Inputs:
 * - "mode" -> if "Add" the modal is built to add a new transition; if "Remove" it is built to remove an existing one.
 */
function buildModalTransitionEditor(mode) {
    // Set the click handling (of "transition-starting-state-selector") to fill the "transition-operation-selector" depending on the "mode"
    var startSelector = $("#transition-starting-state-selector")[0];
    startSelector.setAttribute("onclick", "fillOperationSelector('" + mode + "'); fillRequirementsCheckbox()");
    startSelector.click();
    var targetSelector = $("#transition-target-state-selector")[0];
    targetSelector.setAttribute("onclick", "fillRequirementsCheckbox()");


    // Display the "target-state-selector" and the "transition-requirements-checkbox" only if "mode" is "Add"
    if (mode == 'Add') $(".transition-hide-show").show()
    else if (mode == 'Remove') $(".transition-hide-show").hide()

    // Set the confirm button's string to 'Add' or 'Remove'
    var confirmButton = $("#transition-editor-confirm")[0];
    confirmButton.innerHTML = mode;
    confirmButton.setAttribute("onclick", "addOrRemoveTransition('" + mode + "')");
}

/*
 * This function fills the operation selector in "modal-transition-editor" 
 * Inputs:
 * - "mode" -> if "Add" the function fills the selector with the operations that can still outgo from the selected state; if "Remove" it fills the selector with the operations that already outgo from the selected state
 */
function fillOperationSelector(mode) {
    var selector = $("#transition-operation-selector")[0];
    // Clean "selector"
    selector.innerHTML = "";

    // Get the state to be edited
    var state = $("#transition-starting-state-selector")[0].value;

    // Get options (operations that can be added/removed) to fill the selector
    var opts = [];
    var outgoingOps = mProt.getOutgoingTransitions(state);
    if (mode == 'Add') {
        // "opts" is filled with all operations that can still outgo from "state"
        var ops = mProt.getOps();
        for (var i = 0; i < ops.length; i++) {
            var outgoes = false;
            for (var j = 0; j < outgoingOps.length; j++) {
                if (ops[i].iface == outgoingOps[j].iface && ops[i].operation == outgoingOps[j].operation)
                    outgoes = true
            }
            if (!outgoes)
                opts.push(ops[i].iface + ":" + ops[i].operation)
        }
    } else if (mode == 'Remove') {
        // "opts" is filled with operations that already outgoes from "state"
        for (var i = 0; i < outgoingOps.length; i++)
            opts.push(outgoingOps[i].iface + ":" + outgoingOps[i].operation)
    }

    // Add an option for each of the above 
    for (var o in opts) {
        var option = document.createElement("option");
        option.innerHTML = opts[o];
        selector.appendChild(option);
    }
}

/*
 * This function fills the "transition-requirements-checkbox" in the "modal-transition-editor"
 */
function fillRequirementsCheckbox() {
    var startingState = $("#transition-starting-state-selector")[0].value;
    var targetState = $("#transition-target-state-selector")[0].value;

    var reqs = mProt.getReqs();

    // Add an option for each requirement in "reqs"
    var checkbox = $("#transition-requirements-checkbox")[0];
    checkbox.innerHTML = "";
    for (var r in reqs) {
        var label = document.createElement("label");
        checkbox.appendChild(label);
        var input = document.createElement("input");
        input.type = "checkbox";
        input.value = reqs[r];
        label.appendChild(input);
        label.innerHTML = label.innerHTML + " " + reqs[r];
    }
}

/*
 * This function adds or removes a transition from the current management protocol. 
 * Inputs:
 * - "mode" -> if "Add", the function adds a novel transition to the management protocol; if "Remove", it removes a transition from such protocol.
 */
function addOrRemoveTransition(mode) {
    var startingState = $("#transition-starting-state-selector")[0].value;
    var op = $("#transition-operation-selector")[0].value.split(":");
    var reqs = {};
    $.each($("#transition-requirements-checkbox")[0].getElementsByTagName("input"), function (i, el) {
        if (el.checked) reqs[el.value] = true;
    });

    if (mode == 'Add') {
        var targetState = $("#transition-target-state-selector")[0].value;
        mProt.addTransition(startingState, targetState, op[0], op[1], reqs);
        drawTransition(startingState, targetState, op[0], op[1], reqs);
    }
    else if (mode == 'Remove') {
        mProt.removeTransition(startingState, op[1], op[0]);
        deleteTransition(startingState, op[1]);
    }

    buildSimulator();
}

/*
 * This function builds the "modal-fault-editor".
 * Inputs:
 * - "mode" -> if "Add" the modal is built to add a new fault handling transition; if "Remove" it is built to remove an existing one.
 */
function buildModalFaultEditor(mode) {
    // Set the click handling (of "transition-starting-state-selector") to fill the "transition-operation-selector" depending on the "mode"
    var startSelector = $("#fault-starting-state-selector")[0];
    startSelector.setAttribute("onclick", "fillFaultedRequirementsCheckbox()");
    startSelector.click();

    // Display the "target-state-selector" and the "transition-requirements-checkbox" only if "mode" is "Add"
    if (mode == 'Add') $(".fault-hide-show").show()
    else if (mode == 'Remove') $(".fault-hide-show").hide()

    // Set the confirm button's string to 'Add' or 'Remove'
    var confirmButton = $("#fault-editor-confirm")[0];
    confirmButton.innerHTML = mode;
    confirmButton.setAttribute("onclick", "alert('TODO - " + mode + "')");
}

/*
 * This function fills the "fault-requirements-checkbox" in the "modal-fault-editor"
 */
function fillFaultedRequirementsCheckbox() {
    var startingState = $("#fault-starting-state-selector")[0].value;
    var reqs = mProt.getState(startingState).getReqs();

    var checkbox = $("#fault-requirements-checkbox")[0];
    checkbox.innerHTML = "";

    if (reqs.length == 0) {
        checkbox.innerHTML = "None";
        $("#fault-target-state-selector, #fault-editor-confirm").prop("disabled", true);
    }
    else {
        $("#fault-target-state-selector, #fault-editor-confirm").prop("disabled", false);
        // Add an option for each requirement in "reqs"
        for (var r in reqs) {
            var label = document.createElement("label");
            checkbox.appendChild(label);
            var input = document.createElement("input");
            input.type = "checkbox";
            input.value = reqs[r];
            label.appendChild(input);
            label.innerHTML = label.innerHTML + " " + reqs[r];
        }
    }
}

/*
 * This function is a wrapper for "Simulator.build" and permits (re)building the "Simulator" pane from scratch.
 */
function buildSimulator() {
    var uiData = TOSCAAnalysis.serviceTemplateToApplication(csar.get("ServiceTemplate")[0].element, csar.getTypes());
    Simulator.build($("#simulator-body")[0], uiData);
}

////////////////////////////////////////////////////////////////////

var onCsarRead = function () {
    var serviceTemplate = csar.get("ServiceTemplate")[0].element;
    var types = csar.getTypes();
    var topology = TOSCAAnalysis.serviceTemplateToApplication(serviceTemplate, types);

    // !-------------------------!
    // !       VISUALISER        !
    // !-------------------------!
    var appName = "Unnamed";
    if (serviceTemplate.hasAttribute("name"))
        appName = serviceTemplate.getAttribute("name");
    $("#application-name")[0].innerHTML = appName;
    $("#topology-table-body")[0].innerHTML = TOSCAAnalysis.uiApplicationToElement(topology);
    drawTopology($("#app-topology")[0], topology);
    $(".hidden").removeClass("hidden");

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
    buildSimulator();

    // !-------------------------!
    // !        ANALYSER         !
    // !-------------------------! 
    // TODO!!!!!!!!!!!!!!
}

var readCsar = function () {
    csarFileName = fileInput.files[0].name;
    csar = new Csar.Csar(fileInput.files[0], onCsarRead);
}

function initialPositioning(divs) {
    var x = 20;
    var y = 20;
    var deltaX = ($(window).width() - 200) / 4;
    var deltaY = ($(window).height() - 100) / 2;
    for (i = 0; i < divs.length; i++) {
        console.log("x:" + x + ";y:" + y);
        divs[i].setAttribute("style", "left:" + x + "px;top:" + y + "px");
        y = y + deltaY;
        if (i % 2 == 1) {
            x = (x + deltaX);
            y = 20;
        }
    }
}

function createState(divEnv, stateName) {
    //creating main state div
    //whose id is "state_<stateName>"
    var divState = document.createElement("div");
    divState.className = "stateDiv";
    divState.id = "state_" + stateName;
    divEnv.append(divState);
    //creating sub-div for state name
    var divStateName = document.createElement("div");
    divStateName.id = divState.id + "_title";
    divStateName.innerHTML = stateName;
    divState.appendChild(divStateName);
    //creating sub-div for state's ReliesOn
    //whose id is "state_<stateName>_ReliesOn"
    var rOn = document.createElement("div");
    rOn.className = "reliesOnOffersDiv";
    rOn.id = divState.id + "_ReliesOn";
    rOn.innerHTML = "Relies on:";
    divState.appendChild(rOn);
    //creating sub-div for state's Offers
    //whose id is "state_<stateName>_Offers"
    var off = document.createElement("div");
    off.className = "reliesOnOffersDiv";
    off.id = divState.id + "_Offers";
    off.innerHTML = "Offers:";
    divState.appendChild(off);

    //attaching jsPlumb anchors
    jsPlumb.draggable(divState.id, {
        containment: "parent"
    });

    return divState;
};

function drawRequirementAssumption(isName, reqName) {
    var reqDiv = document.createElement("div");
    reqDiv.id = "state_" + isName + "_ReliesOn_" + reqName;
    reqDiv.innerHTML = "- " + reqName;
    $("#state_" + isName + "_ReliesOn").append(reqDiv);
};

function drawCapabilityOffering(isName, capName) {
    var capDiv = document.createElement("div");
    capDiv.id = "state_" + isName + "_Offers_" + capName;
    capDiv.innerHTML = "- " + capName;
    $("#state_" + isName + "_Offers").append(capDiv);
};

function deleteRequirementAssumption(isName, reqName) {
    var reqDiv = $("#state_" + isName + "_ReliesOn_" + reqName);
    reqDiv.remove();
};

function deleteCapabilityOffering(isName, capName) {
    var capDiv = $("#state_" + isName + "_Offers_" + capName);
    capDiv.remove();
};

function drawTransition(transition) {
    var sourceState = "state_" + transition.source;
    var targetState = "state_" + transition.target;
    var transLabel = "<b>" + transition.iface + ":" + transition.operation + "</b>";
    var reqs = Object.keys(transition.reqs);
    reqs.sort();

    if (reqs.length != 0)
        transLabel += "<br> Relies on: {" + reqs.join(", ") + "}";

    var c = jsPlumb.connect({
        source: sourceState,
        target: targetState,
        anchor: "Continuous",
        connector: ["StateMachine", { curviness: 50 }],
        endpoint: "Blank",
        paintStyle: { strokeStyle: "#112835", lineWidth: 2 },
        hoverPaintStyle: { strokeStyle: "#3399FF" },
        overlays: [
            ["Arrow", { location: 1 }],
            ["Label", { label: transLabel, id: "label", location: 0.4, cssClass: "transLabel" }]
        ]
    });

    jsPlumb.repaintEverything();
};

// PROVA ///////////////////////////////////////////////////////////////////////////////////////////////////
function drawHandler(source, target, reqs) {
    var sourceState = "state_" + source;
    var targetState = "state_" + target;
    var handlerLabel = "<b> {" + reqs.join(", ") + "} </b>";
    var handlerId = sourceState + "_" + reqs.join("-")

    var c = jsPlumb.connect({
        source: sourceState,
        target: targetState,
        anchor: "Continuous",
        connector: ["StateMachine", { curviness: 50 }],
        endpoint: "Blank",
        paintStyle: { strokeStyle: "#95a5a6", lineWidth: 2 },
        hoverPaintStyle: { strokeStyle: "#3399FF" },
        overlays: [
            ["Arrow", { location: 1 }],
            ["Label", { label: handlerLabel, id: "label", location: 0.4, cssClass: "handlerLabel" }]
        ]
    });

    c.setParameter({ id: handlerId });

    jsPlumb.repaintEverything();
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////

function deleteTransition(sourceState, operationName) {
    var sourceElement = "state_" + sourceState;
    var c = null;

    var connections = jsPlumb.getConnections();
    for (i = 0; i < connections.length; i++) {
        var overlays = connections[i].getOverlays();
        for (j = 0; j < overlays.length; j++) {
            if (overlays[j].type == "Label"
                && overlays[j].label.indexOf(operationName) != -1)
                c = connections[i];
        }
    }
    jsPlumb.detach(c);
}

function updateInitialState(newInitialState) {
    $(".initial").remove("initial");
    $(".stateDiv").removeClass("initial");
    $("#state_" + newInitialState).addClass("initial");
    mProt.setInitialState(newInitialState);
    buildSimulator();
}

function populateOpsSelectors() {
    var opsOptions =
        Object.keys(mProt.getOps())
            .map(function (v) { return "<option>" + v + "</option>" })
            .join("");

    $(".op-selector").html(stateOptions);
}

function populateStateSelectors(instanceStates) {
    var stateOptions =
        Object.keys(instanceStates)
            .map(function (v) { return "<option>" + v + "</option>" })
            .join("");

    $(".state-selector").html(stateOptions);

    // Customise initial state selector
    var iniStateSelector = $("#initial-state-selector")[0];
    // Add handler to update initial state
    iniStateSelector.onclick = function () { updateInitialState(iniStateSelector.value); };
    // Initialise current initial state
    var iniState = mProt.getInitialState();
    $.each(iniStateSelector.children, function (i, n) {
        if (n.value == iniState)
            n.setAttribute("selected", true);
    });
}

function populateReqsCapsCheckboxes() {
    var reqsCheckboxes =
        Object.keys(mProt.getReqs())
            .map(function (v) { return "<label><input class='req-checkbox' type='checkbox'>" + v + "</label>" })
            .join("");

    $(".reqs-checkbox-group").html(reqsCheckboxes);

    var capsCheckboxes =
        Object.keys(mProt.getCaps())
            .map(function (v) { return "<label><input class='cap-checkbox' type='checkbox'>" + v + "</label>" })
            .join("");

    $(".caps-checkbox-group").html(capsCheckboxes);

    updateStateVals($("#modal-state-editor #state-editor-selector").val());
}

function populateMProtGraph(instanceStates) {
    var divEnv = $("#management-protocol-display");
    divEnv.html("");

    jsPlumb.reset();

    // Create editor divs
    var stateDivs = [];

    for (var stateName in instanceStates) {
        var state = instanceStates[stateName];
        var divState = createState(divEnv, stateName);
        stateDivs.push(divState);

        for (var req in state.getReqs())
            drawRequirementAssumption(stateName, req);

        for (var cap in state.getCaps())
            drawCapabilityOffering(stateName, cap);

        var iniState = mProt.getInitialState();
        if (iniState != null)
            updateInitialState(iniState);
    }

    initialPositioning(stateDivs);
    jsPlumb.repaintEverything();

    mProt.getTransitions().forEach(drawTransition);

    jsPlumb.repaintEverything();
}

function drawEnvironment(nodeName) {
    var instanceStates = mProt.getStates();

    $("#management-protocol-node-type-name")[0].innerHTML = nodeName;
    populateMProtGraph(instanceStates);
    populateStateSelectors(instanceStates);
    populateReqsCapsCheckboxes();
    populateOpsSelectors();
};

function exportXMLDoc() {
    var url = URL.createObjectURL(mProt.getXML());
    window.open(url, "_blank", "");
}

function exportCsar() {
    mProt.save(function () {
        csar.exportBlob(function (blob) {
            var url = URL.createObjectURL(blob);
            setTimeout(function () {
                var a = document.createElement("a");
                a.style = "display: none";
                a.href = url;
                a.download = csarFileName;
                document.body.appendChild(a);
                a.click();
                setTimeout(function () {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 0);
            }, 0);
        });
    });
}
