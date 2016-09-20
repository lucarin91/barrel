/// <reference path="Utils.ts" />
var Analysis;
(function (Analysis) {
    var Step = (function () {
        function Step(nodeId, opId, isOp) {
            this.nodeId = nodeId;
            this.opId = opId;
            this.isOp = isOp;
        }
        return Step;
    }());
    Analysis.Step = Step;
    // An operation can only go to a single state,
    // it might be possible to perform it with multiple sets of constraints are allowed
    var Operation = (function () {
        function Operation(to, reqs) {
            this.to = to;
            this.reqs = reqs;
        }
        return Operation;
    }());
    Analysis.Operation = Operation;
    var State = (function () {
        function State(caps, reqs, ops, handlers) {
            this.caps = caps;
            this.reqs = reqs;
            this.ops = ops;
            this.handlers = handlers;
        }
        return State;
    }());
    Analysis.State = State;
    var Node = (function () {
        function Node(type, caps, reqs, ops, states, stateId) {
            this.type = type;
            this.caps = caps;
            this.reqs = reqs;
            this.ops = ops;
            this.states = states;
            this.stateId = stateId;
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
        Node.prototype.performOp = function (opId) {
            if (!(opId in this.state.ops))
                throw "Operation " + opId + " is not supported in the current state";
            return new Node(this.type, this.caps, this.reqs, this.ops, this.states, this.state.ops[opId].to);
        };
        Node.prototype.handleFault = function (req) {
            if (!(req in this.state.handlers))
                throw "No fault handler for " + req + " in the current state";
            return new Node(this.type, this.caps, this.reqs, this.ops, this.states, this.state.handlers[req]);
        };
        return Node;
    }());
    Analysis.Node = Node;
    var Application = (function () {
        function Application(nodes, binding) {
            this.nodes = nodes;
            this.binding = binding;
            this.capNodeId = {};
            this.reqs = {};
            this.caps = {};
            this.faults = {};
            this.isConsistent = true;
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
        Application.prototype.isReqSatisfied = function (req) {
            return this.caps[this.binding[req]] || false;
        };
        Application.prototype.areReqsSatisfied = function (reqs) {
            for (var req in reqs)
                if (!this.isReqSatisfied(req))
                    return false;
            return true;
        };
        Application.prototype.unsatisfiedOpConstraints = function (nodeId, opId) {
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
        };
        Application.prototype.canPerformOp = function (nodeId, opId) {
            return !this.unsatisfiedOpConstraints(nodeId, opId);
        };
        Application.prototype.performOp = function (nodeId, opId) {
            var constraints = this.unsatisfiedOpConstraints(nodeId, opId);
            if (constraints)
                throw constraints;
            var nodes = Utils.cloneMap(this.nodes);
            var node = nodes[nodeId];
            nodes[nodeId] = node.performOp(opId);
            return new Application(nodes, this.binding);
        };
        Application.prototype.unsatisfiedHandlerConstraints = function (nodeId, r) {
            if (!(r in this.faults))
                return "Requirement " + r + " is not currently faulted";
            if (!(nodeId in this.nodes))
                return "There is no " + nodeId + " node in the application";
            if (!(r in this.nodes[nodeId].state.handlers))
                return "The " + r + " requirement has no fault handler from the current state of the " + nodeId + " node";
        };
        Application.prototype.canHandleFault = function (nodeId, r) {
            return !this.unsatisfiedHandlerConstraints(nodeId, r);
        };
        Application.prototype.handleFault = function (nodeId, r) {
            var constraints = this.unsatisfiedHandlerConstraints(nodeId, r);
            if (constraints)
                throw constraints;
            var nodes = Utils.cloneMap(this.nodes);
            var node = nodes[nodeId];
            nodes[nodeId] = node.handleFault(r);
            return new Application(nodes, this.binding);
        };
        return Application;
    }());
    Analysis.Application = Application;
    function reachable(application) {
        var visited = {};
        var visit = function (app) {
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
    Analysis.reachable = reachable;
    function plans(app) {
        var states = reachable(app);
        var costs = {};
        var steps = {};
        for (var s in states) {
            costs[s] = (_a = {}, _a[s] = 0, _a);
            steps[s] = {};
        }
        for (var src in states) {
            var state = states[src];
            for (var nodeId in state.nodes)
                for (var opId in state.nodes[nodeId].ops)
                    if (state.canPerformOp(nodeId, opId)) {
                        var dst = state.performOp(nodeId, opId).globalState;
                        var newCost = 1; // TODO: we might want to compute the cost in a clever way
                        // ! used to abuse NaN comparison (which always compares as false)
                        if (!(costs[src][dst] <= newCost)) {
                            costs[src][dst] = newCost;
                            steps[src][dst] = new Step(nodeId, opId, true);
                        }
                    }
            for (var nodeId in state.nodes)
                for (var req in state.nodes[nodeId].reqs)
                    if (state.canHandleFault(nodeId, req)) {
                        var dst = state.handleFault(nodeId, req).globalState;
                        var newCost = 1; // TODO: we might want to compute the cost in a clever way
                        // ! used to abuse NaN comparison (which always compares as false)
                        if (!(costs[src][dst] <= newCost)) {
                            costs[src][dst] = newCost;
                            steps[src][dst] = new Step(nodeId, req, false);
                        }
                    }
        }
        for (var via in states) {
            for (var src in states) {
                if (src == via || !(via in costs[src]))
                    continue;
                for (var dst in costs[via]) {
                    // ! used to abuse NaN comparison (which always compares as false)
                    if (!(costs[src][dst] <= costs[src][via] + costs[via][dst])) {
                        costs[src][dst] = costs[src][via] + costs[via][dst];
                        steps[src][dst] = steps[src][via];
                    }
                }
            }
        }
        return { costs: costs, steps: steps };
        var _a;
    }
    Analysis.plans = plans;
})(Analysis || (Analysis = {}));