/// <reference path="Utils.ts" />

module Analysis {
    export class Step {
        constructor(public nodeId: string,
                    public opId: string,
                    public isOp: boolean) { }
    }

    // An operation can only go to a single state,
    // it might be possible to perform it with multiple sets of constraints are allowed
    export class Operation {
        constructor(public to: string,
            public reqs: Utils.Set[]) { }
    }

    export class State {
        constructor(public caps: Utils.Set,
            public reqs: Utils.Set,
            public ops: Utils.Map<Operation>,
            public handlers: Utils.Map<string>) { }
    }

    export class Node {
        public state: State;

        constructor(public type: string,
            public caps: Utils.Set,
            public reqs: Utils.Set,
            public ops: Utils.Set,
            public states: Utils.Map<State>,
            public stateId: string) {

            // Check input states
            for (var sid in states) {
                var state = states[sid];
                for (var c in state.caps)
                    if (!caps[c])
                        throw "Unknown capability " + c + " in state " + sid;

                for (var r in state.reqs)
                    if (!reqs[r])
                        throw "Unknown requirement " + r + " in state " + sid;

                for (var o in state.ops) {
                    if (!ops[o])
                        throw "Unknown operation " + o + " in state " + sid;

                    if (!state.ops[o].to)
                        throw "Unknown destination state " + state.ops[o].to + " in transition " + o + " from state " + sid;

                    for (var i = 0; i < state.ops[o].reqs.length; i++)
                        for (var r in state.ops[o].reqs[i])
                            if (!reqs[r])
                                throw "Unknown requirement " + r + " in transition " + o + " from state " + sid;
                }

                for (var r in state.handlers) {
                    if (!reqs[r])
                        throw "Unknown requirement " + r + " in fault handler from state " + sid;
                    if (!states[state.handlers[r]])
                        throw "Unknown target state " + state.handlers[r] + " in handler of " + r + " from state " + sid;
                }
            }

            this.state = this.states[this.stateId];
        }

        performOp(opId: string) {
            if (!(opId in this.state.ops))
                throw "Operation " + opId + " is not supported in the current state";

            return new Node(
                this.type,
                this.caps,
                this.reqs,
                this.ops,
                this.states,
                this.state.ops[opId].to
            );
        }

        handleFault(req: string) {
            if (!(req in this.state.handlers))
                throw "No fault handler for " + req + " in the current state";

            return new Node(
                this.type,
                this.caps,
                this.reqs,
                this.ops,
                this.states,
                this.state.handlers[req]
            );
        }
    }

    export class Application {
        public capNodeId: Utils.Map<string> = {};
        public globalState: string;
        public reqs: Utils.Set = {};
        public caps: Utils.Set = {};
        public faults: Utils.Set = {};
        public isConsistent = true;

        constructor(public nodes: Utils.Map<Node>,
                    public binding: Utils.Map<string>) {
            var states = [];
            for (var nodeId in nodes) {
                var node = nodes[nodeId];
                var nodeState = node.state;
                states.push(nodeId + "=" + node.stateId);
                this.reqs = Utils.setUnion(this.reqs, nodeState.reqs);
                this.caps = Utils.setUnion(this.caps, nodeState.caps);
                for (var c in node.caps)
                    this.capNodeId[c] = nodeId;
            }

            for (var req in this.reqs)
                if (!this.isReqSatisfied(req))
                    this.faults[req] = true;

            this.isConsistent = Utils.isEmptySet(this.faults);
            this.globalState = states.sort().join("|");
        }

        private isReqSatisfied(req: string) {
            return this.caps[this.binding[req]] || false;
        }

        private areReqsSatisfied(reqs: Utils.Set) {
            for (var req in reqs)
                if (!this.isReqSatisfied(req))
                    return false;

            return true;
        }

        unsatisfiedOpConstraints(nodeId: string, opId: string) {
            if (!this.isConsistent)
                return "Operations are not allowed while faults are pending";

            if (!(nodeId in this.nodes))
                return "There is no " + nodeId + " node in the application";

            if (!(opId in this.nodes[nodeId].state.ops))
                return "The " + opId + " operation is not available in the current state of the " + nodeId + " node";

            var opReqSets = this.nodes[nodeId].state.ops[opId].reqs;
            for (var i = 0; i < opReqSets.length; i++)
                if (this.areReqsSatisfied(opReqSets[i]))
                    return "";

            return "The requirements of the operation cannot be satisfied";
        }

        canPerformOp(nodeId: string, opId: string) {
            return !this.unsatisfiedOpConstraints(nodeId, opId);
        }

        performOp(nodeId: string, opId: string) {
            var constraints = this.unsatisfiedOpConstraints(nodeId, opId);
            if (constraints)
                throw constraints;

            var nodes = Utils.cloneMap(this.nodes);
            var node = nodes[nodeId];
            nodes[nodeId] = node.performOp(opId);
            return new Application(nodes, this.binding);
        }

        unsatisfiedHandlerConstraints(nodeId: string, r: string) {
            if (!(r in this.faults))
                return "Requirement " + r + " is not currently faulted";

            if (!(nodeId in this.nodes))
                return "There is no " + nodeId + " node in the application";

            if (!(r in this.nodes[nodeId].state.handlers))
                return "The " + r + " requirement has no fault handler from the current state of the " + nodeId + " node";
        }

        canHandleFault(nodeId: string, r: string) {
            return !this.unsatisfiedHandlerConstraints(nodeId, r);
        }

        handleFault(nodeId: string, r: string) {
            var constraints = this.unsatisfiedOpConstraints(nodeId, r);
            if (constraints)
                throw constraints;

            var nodes = Utils.cloneMap(this.nodes);
            var node = nodes[nodeId];
            nodes[nodeId] = node.handleFault(r);
            return new Application(nodes, this.binding);
        }
    }

    export function reachable(application: Application) {
        var visited: Utils.Map<Application> = {};
        var visit = function(app: Application) {
            if (app.globalState in visited)
                return;

            visited[app.globalState] = app;

            for (var nodeId in app.nodes)
                for (var opId in app.nodes[nodeId].ops)
                    if (app.canPerformOp(nodeId, opId))
                        visit(app.performOp(nodeId, opId));

            for (var nodeId in app.nodes)
                for (var req in app.nodes[nodeId].reqs)
                    if (app.canHandleFault(nodeId, req))
                        visit(app.handleFault(nodeId, req));
        };
        visit(application);
        return visited;
    }

    export function plans(app: Application) {
        var states = reachable(app);
        var costs: Utils.Map<Utils.Map<number>> = {};
        var steps: Utils.Map<Utils.Map<Step>> = {};

        for (var s in states) {
            costs[s] = { [s] : 0 };
            steps[s] = {};
        }

        for (var src in states) {
            var state = states[src];

            for (var nodeId in state.nodes)
                for (var opId in state.nodes[nodeId].ops)
                    if (state.canPerformOp(nodeId, opId)) {
                        var dst = state.performOp(nodeId, opId).globalState;
                        costs[src][dst] = 1;
                        steps[src][dst] = new Step(nodeId, opId, true);
                    }

            for (var nodeId in state.nodes)
                for (var req in state.nodes[nodeId].reqs)
                    if (state.canHandleFault(nodeId, req)) {
                        var dst = state.handleFault(nodeId, req).globalState;
                        costs[src][dst] = 1;
                        steps[src][dst] = new Step(nodeId, req, false);
                    }
        }

        for (var src in states)
            for (var dst in states)
                for (var via in states)
                    // ! used to abuse undefined sum (which always compares as false)
                    if (src != via && !(costs[src][dst] <= costs[src][via] + costs[via][dst])) {
                        costs[src][dst] = costs[src][via] + costs[via][dst];
                        steps[src][dst] = steps[src][via];
                    }

        return { costs: costs, steps: steps };
    }
}