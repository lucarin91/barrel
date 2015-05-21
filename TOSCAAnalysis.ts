/// <reference path="TOSCA.ts" />
/// <reference path="Analysis.ts" />
/// <reference path="ManagementProtocols.ts" />

module TOSCAAnalysis {
    export interface UINames {
	[id: string]: string
    }

    export class UIData<T> {
	constructor(public data: T,
		    public uiNames: UINames) { }
    }

    function toscaString(node: Element, tagName: string, attr: string) {
	var nodes = getToscaElements(node, tagName);
	if (nodes.length != 1)
	    throw "Invalid format";

	var element = <Element> nodes[0];
	return element.getAttribute(attr);
    }

    function toscaMap(node: Element, tagName: string, attr: string) {
	var data:Analysis.Map<string> = {};
	var uiNames:UINames = {};
	var nodes = getToscaElements(node, tagName);
	for (var i = 0; i < nodes.length; i++) {
	    var element = <HTMLElement> nodes[0];
	    var v = element.getAttribute(attr);
	    var id = element.id;
	    data[v] = id;
	    uiNames[id] = v;
	}

	return new UIData(data, uiNames);
    }

    function mergeNames(a: UINames, b: UINames) {
	var r:UINames = {};
	for (var v in a)
	    r[v] = a[v];
	for (var v in b)
	    r[v] = b[v];
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
	var typeName = nodeTemplate.getAttribute("type").split(':')[1]
	var mProt = new ManagementProtocol.ManagementProtocol(types[typeName]);

	var transitionToOperation = function(t:ManagementProtocol.Transition) {
	    return new Analysis.Operation(t.target, mapSet(t.reqs, reqNames.data));
	}

	var states:Analysis.Map<Analysis.State> = {};
	var s = mProt.getStates();
	for (var i = 0; i < s.length; i++) {
	    var state = mProt.getState(s[i]);
	    var caps = mapSet(state.getCaps(), capNames.data);
	    var reqs = mapSet(state.getReqs(), reqNames.data);
	    var trans = mProt.getOutgoingTransitions(s[i]);
	    var ops:Analysis.Map<Analysis.Operation> = {};
	    for (var j = 0; j < trans.length; j++)
		ops[trans[j].iface + ":" + trans[j].operation] = transitionToOperation(trans[j]);
	    states[s[i]] = new Analysis.State(caps, reqs, ops);
	}

	return new UIData(new Analysis.Node(states, mProt.getInitialState()),
			  mergeNames(reqNames.uiNames, capNames.uiNames));
    }

    export function serviceTemplateToApplication(serviceTemplate: Element, types:Analysis.Map<Element>) {
	var nodeTemplates = getToscaElements(serviceTemplate, "NodeTemplate");
	var relationships = getToscaElements(serviceTemplate, "RelationshipTemplate");

	var nodes:Analysis.Map<Analysis.Node> = {};
	var binding:Analysis.Map<string> = {};
	var uiNames:UINames = {};

	for (var i = 0; i < nodeTemplates.length; i++) {
	    var template = <HTMLElement> nodeTemplates[i];
	    var n = nodeTemplateToNode(template, types);
	    nodes[template.id] = n.data;
	    uiNames = mergeNames(uiNames, n.uiNames);
	}

	for (var i = 0; i < relationships.length; i++) {
	    var rel = <Element> relationships[i];
	    var req = toscaString(rel, "SourceElement", "ref");
	    var cap = toscaString(rel, "TargetElement", "ref");
	    binding[req] = cap;
	}

	return new UIData(new Analysis.Application(nodes, binding), uiNames);
    }
}
