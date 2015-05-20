/// <reference path="TOSCA.ts" />

module ManagementProtocol {

    var mprotNS = "http://di.unipi.it/~soldani/mprot";

    export interface Transition {
	source: string;
	target: string;
	operation: string;
	iface: string;
	reqs: string[];
    }

    export interface InterfaceOperation {
	iface: string;
	operation: string;
    }

    function createElementGroup(els: string[], doc: Document, groupTag: string, elementTag: string, attr: string) {
	var group = doc.createElementNS(mprotNS, groupTag);
	for (var i = 0; i < els.length; i++) {
	    var el = doc.createElementNS(mprotNS, elementTag);
	    el.setAttribute(attr, els[i]);
	    group.appendChild(el);
	}

	return group;
    }

    function attrsToStrings(nodes: NodeList, attr: string) {
	var r: string[] = [];
	for(var i = 0; i < nodes.length; i++) {
	    var el = <Element>nodes[i];
	    r.push(el.getAttribute(attr));
	}
	return r;
    }

    function removeAll(nodes: NodeList) {
	for (var i = 0; i < nodes.length; i++)
	    nodes[i].parentNode.removeChild(nodes[i]);
    }

    function getMProtElements(node: Element, tagName: string) {
	return node.getElementsByTagNameNS(mprotNS, tagName);
    }

    export class State {
	constructor(private state: Element) { }

	private get(tagName: string) {
	    return getMProtElements(this.state, tagName);
	}

	getReqs() {
	    return attrsToStrings(this.get("Requirement"), "name");
	}

	getCaps() {
	    return attrsToStrings(this.get("Capability"), "name");
	}

	setReqs(reqs: string[]) {
	    removeAll(this.get("ReliesOn"));
	    if (reqs.length != 0)
		this.state.insertBefore(createElementGroup(reqs, this.state.ownerDocument, "ReliesOn", "Requirement", "name"), this.state.firstChild);
	}

	setCaps(caps: string[]) {
	    removeAll(this.get("Offers"));
	    if (caps.length != 0)
		this.state.appendChild(createElementGroup(caps, this.state.ownerDocument, "Offers", "Capability", "name"));
	}
    }

    export class ManagementProtocol {
	private nodeType: Element;
	private mprot: Element;

	constructor(private doc: ToscaDocument,
		    name: string,
		    onend: () => void)
	{
	    var that = this;

	    var ensureTransitions = function() {
		var transitions = that.getMProt("Transitions");
		if (transitions.length != 1) {
		    removeAll(transitions);
		    that.mprot.appendChild(that.doc.doc.createElementNS(mprotNS, "Transitions"));
		}
	    }
	    
	    var outerend = function() {
		that.mprot = <Element> that.getMProt("ManagementProtocol")[0];
		ensureTransitions();
		if (onend !== undefined)
		    onend();
	    }

	    var findNodeType = function() {
		var nts = doc.get("NodeType");

		for (var i = 0; i < nts.length; i++) {
		    var nt = <Element> nts[i];
		    if (nt.getAttribute("name") == name)
			return nt;
		}

		throw "Did not find NodeType " + name;
	    }

	    var init = function() {
		var defs = <Element> doc.doc.firstChild;
		defs.setAttribute("xmlns:mprot", mprotNS);
		removeAll(that.getMProt("ManagementProtocol"));
		that.nodeType.appendChild(that.doc.doc.createElementNS(mprotNS, "ManagementProtocol"));

		that.save(function() {
		    that.doc.reload(function() {
			that.nodeType = findNodeType();
			outerend();
		    });
		});
	    }

	    this.nodeType = findNodeType();
	    
	    if (this.getMProt("ManagementProtocol").length != 1)
		init();
	    else
		outerend();
	}
	
	private getTosca(tagName: string) {
	    return getToscaElements(this.nodeType, tagName);
	}

	private getMProt(tagName: string) {
	    return getMProtElements(this.nodeType, tagName);
	}

	save(onend: () => void) {
	    this.doc.save(onend);
	}

	getReqs() {
	    return attrsToStrings(this.getTosca("RequirementDefinition"), "name");
	}

	getCaps() {
	    return attrsToStrings(this.getTosca("CapabilityDefinition"), "name");
	}

	getStates() {
	    return attrsToStrings(this.getTosca("InstanceState"), "state");
	}

	getOps() {
	    var r: InterfaceOperation[] = [];
	    var ops = getToscaElements(this.nodeType, "Operation");
	    for(var i = 0; i < ops.length; i++) {
		var op = <Element>ops[i];
		var iface = <Element>op.parentNode;
		r.push({
		    operation: op.getAttribute("name"),
		    iface: iface.getAttribute("name")
		});
	    }
	    return r;
	}

	getState(state: string) {
	    var states = this.getTosca("InstanceState");
	    for(var i = 0; i < states.length; i++) {
		var el = <Element> states[i];
		if (el.getAttribute("state") == state)
		    return new State(el);
	    }

	    return null;
	}

	getInitialState() {
	    var initialStates = this.getMProt("InitialState");
	    if (initialStates.length != 1)
		return null;

	    var state = <Element> initialStates[0];
	    return state.getAttribute("state");
	}

	setInitialState(state: string) {
	    removeAll(this.getMProt("InitialState"));

	    var stateNode = this.doc.doc.createElementNS(mprotNS, "InitialState");
	    stateNode.setAttribute("state", state);
	    this.mprot.insertBefore(stateNode, this.mprot.firstChild);
	}

	private hasTransition(source: string, opName: string, ifaceName: string) {
	    var trans = this.getOutgoingTransitions(source);
	    for(var i = 0; i < trans.length; i++)
		if (trans[i].operation == opName && trans[i].iface == ifaceName)
		    return true;
	    
	    return false
	}
	
	addTransition(source: string, target: string, opName: string, ifaceName: string, reqs: string[]) {
	    if (this.hasTransition(source, opName, ifaceName))
		return false;

	    var t = this.doc.doc.createElementNS(mprotNS, "Transition");
	    t.setAttribute("sourceState", source);
	    t.setAttribute("targetState", target);
	    t.setAttribute("operationName", opName);
	    t.setAttribute("interfaceName", ifaceName);
	    if(reqs.length > 0)
		t.appendChild(createElementGroup(reqs, this.doc.doc, "ReliesOn", "Requirement", "name"));
	    
	    this.getMProt("Transitions")[0].appendChild(t);
	    return true;
	}

	removeTransition(source: string, opName: string, ifaceName: string /* TODO?, reqs: string[] */) {
	    var trans = this.getMProt("Transition");
	    for (var i = 0; i < trans.length; i++) {
		var t = <Element> trans[i];
		if (t.getAttribute("sourceState") == source &&
		    // determinism t.getAttribute("targetState") == target &&
		    t.getAttribute("operationName") == opName &&
		    t.getAttribute("interfaceName") == ifaceName)
		{
		    t.parentNode.removeChild(t);
		}
	    }
	}

	getXML() {
	    return this.doc.getXML();
	}

	getTransitions() {
	    var r: Transition[] = [];
	    var trans = this.getMProt("Transition");
	    for (var i = 0; i < trans.length; i++) {
		var t = <Element> trans[i];
		r.push({
		    source: t.getAttribute("sourceState"),
		    target: t.getAttribute("targetState"),
		    operation: t.getAttribute("operationName"),
		    iface: t.getAttribute("interfaceName"),
		    reqs: attrsToStrings(getMProtElements(t, "Requirement"), "name")
		});
	    }
	    return r;
	}
	
	//Returns the set of "state"'s outgoing transitions
	getOutgoingTransitions(state: string) {
	    var trans = this.getTransitions();
	    for(var i = 0; i < trans.length; i++) {
		if (trans[i].source != state) {
		    trans.splice(i, 1);
		    i--;
		}
	    }

	    return trans;
	}
    }
}
