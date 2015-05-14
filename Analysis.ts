module Analyzer {
    export interface Map<T> { [id: string]: T; }
    
    export class Operation {
	constructor(public to: string,
		    public reqs: string[]) { }
    }

    export class State {
	constructor(public caps: string[],
		    public reqs: string[],
		    public ops: Map<Operation>) { }
    }

    export class Node {
	constructor(public states: Map<State>,
		    public state: string) { }
    }

    export class Application {
	public caps: Map<boolean>;
	constructor(public nodes: Map<Node>,
		    public binding: Map<string>) {
	    this.caps = {};

	    for (var nodeId in nodes) {
		var node = nodes[nodeId];
		var nodeCaps = node.states[node.state].caps;
		for (var i = 0; i < nodeCaps.length; i++)
		    this.caps[nodeCaps[i]] = true;
	    }
	}

	private reqsSatisfied(reqs: string[]) {
	    for (var i = 0; i < reqs.length; i++) {
		if (!this.caps[this.binding[reqs[i]]])
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

	// Try to perform an operation
	performOp(nodeId: string, opId: string) {
	    var node = this.nodes[nodeId];
	    var state = node.states[node.state];

	    // Bail out if the operation is not supperted in the current state
	    if (!(opId in state.ops))
		return false;
	    var op = state.ops[opId];

	    // Check if the operation requirements are satisfied
	    if (!this.reqsSatisfied(op.reqs))
		return false;

	    // Remove old caps
	    var nodeCaps = node.states[node.state].caps;
	    for (var i = 0; i < nodeCaps.length; i++)
		this.caps[nodeCaps[i]] = false;

	    // Update node state
	    node.state = op.to;
	    
	    // Add new caps
	    var nodeCaps = node.states[node.state].caps;
	    for (var i = 0; i < nodeCaps.length; i++)
		this.caps[nodeCaps[i]] = true;

	    return true;
	}
    }
}
