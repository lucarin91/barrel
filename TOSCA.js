//Parses .tosca file at "fileURL"
function parseToscaDefinitions(fileURL) {
	if(fileURL=="")
		return null;
	fileURL += "?"; //needed to force no-caching
	var TOSCAhttp = new XMLHttpRequest();
	TOSCAhttp.open("GET",fileURL,false);
	TOSCAhttp.send();
	return TOSCAhttp.responseXML;
}

//Finds an element (of a certain "name") inside "toscaDoc"
function getToscaElements(toscaDoc,name) {
	return toscaDoc.getElementsByTagNameNS("http://docs.oasis-open.org/tosca/ns/2011/12",name);
}

//Finds the InstanceStates defined in the NodeType (->"toscaDoc")
function getInstanceStates(toscaDoc) {
	return getToscaElements(toscaDoc,"InstanceState");
}

//Finds the RequirementDefinitions defined in the NodeType (->"toscaDoc")
function getRequirementDefinitions(toscaDoc) {
	return getToscaElements(toscaDoc,"RequirementDefinition");
}

//Finds the CapabilityDefinitions defined in the NodeType (->"toscaDoc")
function getCapabilityDefinitions(toscaDoc) {
	return getToscaElements(toscaDoc,"CapabilityDefinition");
}

//Finds the Operations defined in the NodeType (->"toscaDoc")
function getOperations(toscaDoc) {
	return getToscaElements(toscaDoc,"Operation");
}

//Permits to download "toscaDoc"
function serializeToscaDefinitions(toscaDoc) {
	if (!toscaDoc) {
		alert("ERROR! There are no definitions to be exported.");
		return;
	}
	var xmlString = (new XMLSerializer()).serializeToString(toscaDoc);
	var xmlBlob = new Blob([xmlString], {type: "text/xml"});
	return xmlBlob;
}