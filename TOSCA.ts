/// <reference path="jquery.d.ts" />

function parseToscaMeta(data: string) {
    return /Entry-Definitions: *(.*)/.exec(data)[1].split("/");
}

//Parses .tosca file at "fileURL"
function parseToscaDefinitions(data: string): Element {
    return $.parseXML(data).documentElement;
}

class ToscaDocument {
    private doc: Element;

    constructor(data: string) {
	this.doc = $.parseXML(data).documentElement;
    }

    get(name: string) {
	return this.doc.getElementsByTagNameNS("http://docs.oasis-open.org/tosca/ns/2011/12", name);
    }
}


//Finds an element (of a certain "name") inside "toscaDoc"
function getToscaElements(toscaDoc: Element, name: string) {
    return toscaDoc.getElementsByTagNameNS("http://docs.oasis-open.org/tosca/ns/2011/12", name);
}

//Finds the InstanceStates defined in the NodeType (->"toscaDoc")
function getInstanceStates(toscaDoc: Element) {
    return getToscaElements(toscaDoc, "InstanceState");
}

//Finds the RequirementDefinitions defined in the NodeType (->"toscaDoc")
function getRequirementDefinitions(toscaDoc: Element) {
    return getToscaElements(toscaDoc, "RequirementDefinition");
}

//Finds the CapabilityDefinitions defined in the NodeType (->"toscaDoc")
function getCapabilityDefinitions(toscaDoc: Element) {
    return getToscaElements(toscaDoc, "CapabilityDefinition");
}

//Finds the Operations defined in the NodeType (->"toscaDoc")
function getOperations(toscaDoc: Element) {
    return getToscaElements(toscaDoc, "Operation");
}

//Permits to download "toscaDoc"
function serializeToscaDefinitions(toscaDoc: Element) {
    if (!toscaDoc)
	throw "There are no definitions to be exported.";

    var xmlString = new XMLSerializer().serializeToString(toscaDoc);
    return new Blob([xmlString], { type: "text/xml" });
}
