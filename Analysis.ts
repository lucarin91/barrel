module Analysis {
    export interface Map<T> { [id: string]: T; }
    export interface Set { [id: string]: boolean; }
    
    export class Operation {
	constructor(public to: string,
		    public reqs: Set) { }
    }

    export class State {
	constructor(public caps: Set,
		    public reqs: Set,
		    public ops: Map<Operation>) { }
    }

    export class Node {
	constructor(public states: Map<State>,
		    public state: string) { }
    }

    export class Application {
	public caps: Set;
	constructor(public nodes: Map<Node>,
		    public binding: Map<string>) {
	    this.caps = {};

	    for (var nodeId in nodes) {
		var node = nodes[nodeId];
		for (var cap in node.states[node.state].caps)
		    this.caps[cap] = true;
	    }
	}

	private reqsSatisfied(reqs: Set) {
	    for (var req in reqs) {
		if (!this.caps[this.binding[req]])
		    return false;
	    }
	    return true;
	}

	// Is the global state consistent?
	isConsistent() {
	    for (var nodeId in this.nodes) {
		var node = this.nodes[nodeId];
		if (!this.reqsSatisfied(node.states[node.state].reqs))
		    return false;
	    }
	    return true;
	}

	canPerformOp(nodeId: string, opId: string) {
	    var node = this.nodes[nodeId];
	    var state = node.states[node.state];

	    // Bail out if the operation is not supperted in the current state
	    if (!(opId in state.ops))
		return false;
	    var op = state.ops[opId];

	    // Check if the operation requirements are satisfied
	    return this.reqsSatisfied(op.reqs);
	}
	
	// Try to perform an operation
	performOp(nodeId: string, opId: string) {
	    if (!this.canPerformOp(nodeId, opId))
		throw "Illegal operation";

	    var node = this.nodes[nodeId];
	    var state = node.states[node.state];
	    var op = state.ops[opId];

	    // Remove old caps
	    for (var cap in node.states[node.state].caps)
		this.caps[cap] = false;

	    // Update node state
	    node.state = op.to;
	    
	    // Add new caps
	    for (var cap in node.states[node.state].caps)
		this.caps[cap] = true;
	}
    }
}
