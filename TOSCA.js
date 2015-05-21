/// <reference path="jquery.d.ts" />
function parseToscaMeta(data) {
    return /Entry-Definitions: *(.*)/.exec(data)[1].split("/");
}
//Parses .tosca file at "fileURL"
function parseToscaDefinitions(data) {
    return $.parseXML(data).documentElement;
}
var ToscaDocument = (function () {
    function ToscaDocument(_load, _save, onend) {
        this._load = _load;
        this._save = _save;
        this.reload(onend);
    }
    ToscaDocument.prototype.get = function (name) {
        return this.doc.getElementsByTagNameNS("http://docs.oasis-open.org/tosca/ns/2011/12", name);
    };
    ToscaDocument.prototype.reload = function (onend) {
        var that = this;
        this._load(function (data) {
            that.doc = $.parseXML(data);
            onend();
        });
    };
    ToscaDocument.prototype.getXMLString = function () {
        return new XMLSerializer().serializeToString(this.doc);
    };
    ToscaDocument.prototype.getXML = function () {
        return new Blob([this.getXMLString()], { type: "text/xml" });
    };
    ToscaDocument.prototype.save = function (onend) {
        this._save(this.getXMLString(), onend);
    };
    return ToscaDocument;
})();
//Finds an element (of a certain "name") inside "toscaDoc"
function getToscaElements(toscaDoc, name) {
    return toscaDoc.getElementsByTagNameNS("http://docs.oasis-open.org/tosca/ns/2011/12", name);
}
//Finds the InstanceStates defined in the NodeType (->"toscaDoc")
function getInstanceStates(toscaDoc) {
    return getToscaElements(toscaDoc, "InstanceState");
}
//Finds the RequirementDefinitions defined in the NodeType (->"toscaDoc")
function getRequirementDefinitions(toscaDoc) {
    return getToscaElements(toscaDoc, "RequirementDefinition");
}
//Finds the CapabilityDefinitions defined in the NodeType (->"toscaDoc")
function getCapabilityDefinitions(toscaDoc) {
    return getToscaElements(toscaDoc, "CapabilityDefinition");
}
//Finds the Operations defined in the NodeType (->"toscaDoc")
function getOperations(toscaDoc) {
    return getToscaElements(toscaDoc, "Operation");
}
//Permits to download "toscaDoc"
function serializeToscaDefinitions(toscaDoc) {
    if (!toscaDoc)
        throw "There are no definitions to be exported.";
    var xmlString = new XMLSerializer().serializeToString(toscaDoc);
    return new Blob([xmlString], { type: "text/xml" });
}
