/// <reference path="TOSCA.ts" />
/// <reference path="Analysis.ts" />
/// <reference path="ManagementProtocols.ts" />

module TOSCAAnalysis {
    function toscaString(node: Element, tagName: string, attr: string) {
	var nodes = getToscaElements(node, tagName);
	if (nodes.length != 1)
	    throw "Invalid format";

	var element = <Element> nodes[0];
	return element.getAttribute(attr);
    }

    function toscaMap(node: Element, tagName: string, attr: string) {
	var r:Analysis.Map<string> = {}
	var nodes = getToscaElements(node, tagName);
	for (var i = 0; i < nodes.length; i++) {
	    var element = <HTMLElement> nodes[0];
	    r[element.getAttribute(attr)] = element.id;
	}
	
	return r;
    }

    function mapSet(a: string[], m:Analysis.Map<string>) {
	var r: Analysis.Set = {};
	for (var i = 0; i < a.length; i++)
	    r[m[a[i]]] = true;
	return r;
    }

    function nodeTemplateToNode(nodeTemplate: Element, types:Analysis.Map<Element>) {
	var capNames = toscaMap(nodeTemplate, "Capability", "name");
	var reqNames = toscaMap(nodeTemplate, "Requirement", "name");
	console.log(nodeTemplate.getAttribute("type"));
	var typeName = nodeTemplate.getAttribute("type").split(':')[1]
	console.log(typeName);
	var mProt = new ManagementProtocol.ManagementProtocol(types[typeName]);
	console.log(mProt);

	var transitionToOperation = function(t:ManagementProtocol.Transition) {
	    return new Analysis.Operation(t.target, mapSet(t.reqs, reqNames));
	}

	var states:Analysis.Map<Analysis.State> = {};
	var s = mProt.getStates();
	for (var i = 0; i < s.length; i++) {
	    var state = mProt.getState(s[i]);
	    var caps = mapSet(state.getCaps(), capNames);
	    var reqs = mapSet(state.getReqs(), reqNames);
	    var trans = mProt.getOutgoingTransitions(s[i]);
	    var ops:Analysis.Map<Analysis.Operation> = {};
	    for (var j = 0; j < trans.length; j++)
		ops[trans[j].iface + ":" + trans[j].operation] = transitionToOperation(trans[j]);
	    states[s[i]] = new Analysis.State(caps, reqs, ops);
	}

	return new Analysis.Node(states, mProt.getInitialState());
    }

    export function serviceTemplateToApplication(serviceTemplate: Element, types:Analysis.Map<Element>) {
	var nodeTemplates = getToscaElements(serviceTemplate, "NodeTemplate");
	var relationships = getToscaElements(serviceTemplate, "RelationshipTemplate");

	var nodes:Analysis.Map<Analysis.Node> = {};
	var binding:Analysis.Map<string> = {};

	for (var i = 0; i < nodeTemplates.length; i++) {
	    var template = <HTMLElement> nodeTemplates[i];
	    nodes[template.id] = nodeTemplateToNode(template, types);
	}

	for (var i = 0; i < relationships.length; i++) {
	    var rel = <Element> relationships[i];
	    var req = toscaString(rel, "SourceElement", "ref");
	    var cap = toscaString(rel, "TargetElement", "ref");
	    binding[req] = cap;
	}

	return new Analysis.Application(nodes, binding);
    }
}
