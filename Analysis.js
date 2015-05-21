var Analysis;
(function (Analysis) {
    var Operation = (function () {
        function Operation(to, reqs) {
            this.to = to;
            this.reqs = reqs;
        }
        return Operation;
    })();
    Analysis.Operation = Operation;
    var State = (function () {
        function State(caps, reqs, ops) {
            this.caps = caps;
            this.reqs = reqs;
            this.ops = ops;
        }
        return State;
    })();
    Analysis.State = State;
    var Node = (function () {
        function Node(states, stateId) {
            this.states = states;
            this.stateId = stateId;
        }
        Node.prototype.getState = function () {
            return this.states[this.stateId];
        };
        return Node;
    })();
    Analysis.Node = Node;
    var Application = (function () {
        function Application(nodes, binding) {
            this.nodes = nodes;
            this.binding = binding;
            this.caps = {};
            for (var nodeId in nodes) {
                var node = nodes[nodeId];
                for (var cap in node.getState().caps)
                    this.caps[cap] = true;
            }
        }
        Application.prototype.reqsSatisfied = function (reqs) {
            for (var req in reqs) {
                if (!this.caps[this.binding[req]])
                    return false;
            }
            return true;
        };
        // Is the global state consistent?
        Application.prototype.isConsistent = function () {
            for (var nodeId in this.nodes) {
                var node = this.nodes[nodeId];
                if (!this.reqsSatisfied(node.getState().reqs))
                    return false;
            }
            return true;
        };
        Application.prototype.canPerformOp = function (nodeId, opId) {
            var node = this.nodes[nodeId];
            var state = node.getState();
            // Bail out if the operation is not supperted in the current state
            if (!(opId in state.ops))
                return false;
            var op = state.ops[opId];
            // Check if the operation requirements are satisfied
            return this.reqsSatisfied(op.reqs);
        };
        // Try to perform an operation
        Application.prototype.performOp = function (nodeId, opId) {
            if (!this.canPerformOp(nodeId, opId))
                throw "Illegal operation";
            var node = this.nodes[nodeId];
            var state = node.getState();
            var op = state.ops[opId];
            for (var cap in state.caps)
                this.caps[cap] = false;
            // Update node state
            node.stateId = op.to;
            for (var cap in node.getState().caps)
                this.caps[cap] = true;
        };
        return Application;
    })();
    Analysis.Application = Application;
})(Analysis || (Analysis = {}));
