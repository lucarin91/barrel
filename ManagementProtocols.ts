/// <reference path="TOSCA.ts" />

var mprotNS = "http://di.unipi.it/~soldani/mprot";

interface InterfaceOperation {
    iface: string;
    operation: string;
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

class ManagementProtocol {
    private node: Element;
    private mprot: Element;
    
    constructor(private doc: ToscaDocument,
		name: string,
		onend: () => void)
    {
	this.findNode(name);

	var that = this;
	var outerend = function() {
	    that.mprot = <Element> that.get("ManagementProtocol")[0];
	    that.ensureTransitions();
	    if (onend !== undefined)
		onend();
	}

    	if (this.get("ManagementProtocol").length != 1)
	    this.init(name, outerend);
	else
	    outerend();
    }

    private findNode(name: string) {
	var nts = this.doc.get("NodeType");

	for (var i = 0; i < nts.length; i++) {
	    this.node = <Element> nts[i];
	    if (this.node.getAttribute("name") == name)
		return;
	}

	throw "Did not find NodeType " + name;
    }

    private init(name: string, onend: () => void) {
	var that = this;
	var defs = <Element> this.doc.doc.firstChild;
	defs.setAttribute("xmlns:mprot", mprotNS);
	removeAll(that.get("ManagementProtocol"));
	that.node.appendChild(that.doc.doc.createElementNS(mprotNS, "ManagementProtocol"));
	
	console.log("initing");
	
	this.doc.save(function() {
	    console.log("saving");
	    that.doc.reload(function() {
		console.log("reloading");
		that.findNode(name);
		console.log("reloaded");
		onend();
	    });
	});
    }
    
    get(tagName: string) {
	return getMProtElements(this.node, tagName);
    }

    getReqs() {
	return attrsToStrings(getToscaElements(this.node, "RequirementDefinition"), "name");
    }

    getCaps() {
	return attrsToStrings(getToscaElements(this.node, "CapabilityDefinition"), "name");
    }

    getStates() {
	return attrsToStrings(getToscaElements(this.node, "InstanceState"), "state");
    }

    getOps() {
	var r: InterfaceOperation[] = [];
	var ops = getToscaElements(this.node, "Operation");
	for(var i = 0; i < ops.length; i++) {
	    var op = <Element>ops[i];
	    var iface = <Element>op.parentNode;
	    r.push({ operation: op.getAttribute("name"), iface: iface.getAttribute("name") });
	}
	return r;
   }

    // Sets the initial state of a management protocol
    setInitialState(state: string) {
	removeAll(this.get("InitialState"));

	var stateNode = this.doc.doc.createElementNS(mprotNS, "InitialState");
	stateNode.setAttribute("state", state);
	this.mprot.insertBefore(stateNode, this.mprot.firstChild);
    }

    private ensureTransitions() {
	var transitions = this.get("Transitions");
	if (transitions.length != 1) {
	    removeAll(transitions);
	    this.mprot.appendChild(this.doc.doc.createElementNS(mprotNS, "Transitions"));
	}
    }

    private hasTransition(source: string, opName: string, ifaceName: string) {
	var trans = this.getOutgoingTransitions(source);
	for(var i = 0; i < trans.length; i++)
	    if (trans[i].getAttribute("operationName") == opName &&
		trans[i].getAttribute("interfaceName") == ifaceName)
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
	if(reqs.length > 0) {
	    var rOn = this.doc.doc.createElementNS(mprotNS, "ReliesOn");
	    for(var i = 0; i < reqs.length; i++) {
		var req = this.doc.doc.createElementNS(mprotNS, "Requirement");
		req.setAttribute("name", reqs[i]);
		rOn.appendChild(req);
	    }
	    t.appendChild(rOn);
	}
	
	this.get("Transitions")[0].appendChild(t);
	return true;
    }

    //Returns the set of "state"'s outgoing transitions
    getOutgoingTransitions(state: string) {
	var trans = this.get("Transition");
	var outTrans: Element[] = [];
	for(var i = 0; i < trans.length; i++) {
	    var el = <Element>trans[i];
	    if (el.getAttribute("sourceState") == state)
		outTrans.push(el);
	}

	return outTrans;
    }

    private lookupState(state: string) {
	var states = this.doc.get("InstanceState");
	for(var i = 0; i < states.length; i++) {
	    var el = <Element> states[i];
	    if (el.getAttribute("state") == state)
		return el;
	}

	throw "Did not find state " + state;
    }

    getStateReqs(state: string) {
	return attrsToStrings(getMProtElements(this.lookupState(state), "Requirement"), "name");
    }
    
    getStateCaps(state: string) {
	return attrsToStrings(getMProtElements(this.lookupState(state), "Capability"), "name");
    }
    
    setStateReqs(state: string, reqs: string[]) {
	var s = this.lookupState(state);
	removeAll(getMProtElements(s, "ReliesOn"));
	if (reqs.length == 0)
	    return;

	var rOn = this.doc.doc.createElementNS(mprotNS, "ReliesOn");
	for (var i = 0; i < reqs.length; i++) {
	    var req = this.doc.doc.createElementNS(mprotNS, "Requirement");
	    req.setAttribute("name", reqs[i]);
	    rOn.appendChild(req);
	}

	s.insertBefore(rOn, s.firstChild);
    }

    setStateCaps(state: string, caps: string[]) {
	var s = this.lookupState(state);
	removeAll(getMProtElements(s, ""));
	if (caps.length == 0)
	    return;

	var off = this.doc.doc.createElementNS(mprotNS, "Offers");
	for (var i = 0; i < caps.length; i++) {
	    var cap = this.doc.doc.createElementNS(mprotNS, "Capability");
	    cap.setAttribute("name", caps[i]);
	    off.appendChild(cap);
	}

	s.appendChild(off);
    }
}
