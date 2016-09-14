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
