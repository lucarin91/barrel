/// <reference path="TOSCA.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ManagementProtocol;
(function (_ManagementProtocol) {
    var mprotNS = "http://di.unipi.it/~soldani/mprot";
    function createElementGroup(els, doc, groupTag, elementTag, attr) {
        var group = doc.createElementNS(mprotNS, groupTag);
        for (var i = 0; i < els.length; i++) {
            var el = doc.createElementNS(mprotNS, elementTag);
            el.setAttribute(attr, els[i]);
            group.appendChild(el);
        }
        return group;
    }
    function attrsToStrings(nodes, attr) {
        var r = [];
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            r.push(el.getAttribute(attr));
        }
        return r;
    }
    function removeAll(nodes) {
        for (var i = 0; i < nodes.length; i++)
            nodes[i].parentNode.removeChild(nodes[i]);
    }
    function getMProtElements(node, tagName) {
        return node.getElementsByTagNameNS(mprotNS, tagName);
    }
    _ManagementProtocol.getMProtElements = getMProtElements;
    var State = (function () {
        function State(state) {
            this.state = state;
        }
        State.prototype.get = function (tagName) {
            return getMProtElements(this.state, tagName);
        };
        State.prototype.getReqs = function () {
            return attrsToStrings(this.get("Requirement"), "name");
        };
        State.prototype.getCaps = function () {
            return attrsToStrings(this.get("Capability"), "name");
        };
        State.prototype.setReqs = function (reqs) {
            removeAll(this.get("ReliesOn"));
            if (reqs.length != 0)
                this.state.insertBefore(createElementGroup(reqs, this.state.ownerDocument, "ReliesOn", "Requirement", "name"), this.state.firstChild);
        };
        State.prototype.setCaps = function (caps) {
            removeAll(this.get("Offers"));
            if (caps.length != 0)
                this.state.appendChild(createElementGroup(caps, this.state.ownerDocument, "Offers", "Capability", "name"));
        };
        return State;
    })();
    _ManagementProtocol.State = State;
    var ManagementProtocol = (function () {
        function ManagementProtocol(nodeType) {
            this.nodeType = nodeType;
            if (nodeType)
                this.reset(nodeType);
        }
        ManagementProtocol.prototype.reset = function (nodeType) {
            this.nodeType = nodeType;
            var mprots = this.getMProt("ManagementProtocol");
            if (mprots.length != 1) {
                removeAll(this.getMProt("ManagementProtocol"));
                this.mprot = nodeType.ownerDocument.createElementNS(mprotNS, "ManagementProtocol");
                nodeType.appendChild(this.mprot);
            }
            else {
                this.mprot = mprots[0];
            }
            var transitions = this.getMProt("Transitions");
            if (transitions.length != 1) {
                removeAll(transitions);
                this.mprot.appendChild(nodeType.ownerDocument.createElementNS(mprotNS, "Transitions"));
            }
            var initialStates = this.getMProt("InitialState");
            if (initialStates.length != 1)
                this.setInitialState(this.getStates()[0]);
        };
        ManagementProtocol.prototype.getTosca = function (tagName) {
            return getToscaElements(this.nodeType, tagName);
        };
        ManagementProtocol.prototype.getMProt = function (tagName) {
            return getMProtElements(this.nodeType, tagName);
        };
        ManagementProtocol.prototype.getReqs = function () {
            return attrsToStrings(this.getTosca("RequirementDefinition"), "name");
        };
        ManagementProtocol.prototype.getCaps = function () {
            return attrsToStrings(this.getTosca("CapabilityDefinition"), "name");
        };
        ManagementProtocol.prototype.getStates = function () {
            return attrsToStrings(this.getTosca("InstanceState"), "state");
        };
        ManagementProtocol.prototype.getOps = function () {
            var r = [];
            var ops = getToscaElements(this.nodeType, "Operation");
            for (var i = 0; i < ops.length; i++) {
                var op = ops[i];
                var iface = op.parentNode;
                r.push({
                    operation: op.getAttribute("name"),
                    iface: iface.getAttribute("name")
                });
            }
            return r;
        };
        ManagementProtocol.prototype.getState = function (state) {
            var states = this.getTosca("InstanceState");
            for (var i = 0; i < states.length; i++) {
                var el = states[i];
                if (el.getAttribute("state") == state)
                    return new State(el);
            }
            return null;
        };
        ManagementProtocol.prototype.getInitialState = function () {
            var state = this.getMProt("InitialState")[0];
            return state.getAttribute("state");
        };
        ManagementProtocol.prototype.setInitialState = function (state) {
            removeAll(this.getMProt("InitialState"));
            var stateNode = this.nodeType.ownerDocument.createElementNS(mprotNS, "InitialState");
            stateNode.setAttribute("state", state);
            this.mprot.insertBefore(stateNode, this.mprot.firstChild);
        };
        ManagementProtocol.prototype.hasTransition = function (source, opName, ifaceName) {
            var trans = this.getOutgoingTransitions(source);
            for (var i = 0; i < trans.length; i++)
                if (trans[i].operation == opName && trans[i].iface == ifaceName)
                    return true;
            return false;
        };
        ManagementProtocol.prototype.addTransition = function (source, target, opName, ifaceName, reqs) {
            if (this.hasTransition(source, opName, ifaceName))
                return false;
            var t = this.nodeType.ownerDocument.createElementNS(mprotNS, "Transition");
            t.setAttribute("sourceState", source);
            t.setAttribute("targetState", target);
            t.setAttribute("operationName", opName);
            t.setAttribute("interfaceName", ifaceName);
            if (reqs.length > 0)
                t.appendChild(createElementGroup(reqs, this.nodeType.ownerDocument, "ReliesOn", "Requirement", "name"));
            this.getMProt("Transitions")[0].appendChild(t);
            return true;
        };
        ManagementProtocol.prototype.removeTransition = function (source, opName, ifaceName /* TODO?, reqs: string[] */) {
            var trans = this.getMProt("Transition");
            for (var i = 0; i < trans.length; i++) {
                var t = trans[i];
                if (t.getAttribute("sourceState") == source && t.getAttribute("operationName") == opName && t.getAttribute("interfaceName") == ifaceName) {
                    t.parentNode.removeChild(t);
                }
            }
        };
        ManagementProtocol.prototype.getTransitions = function () {
            var r = [];
            var trans = this.getMProt("Transition");
            for (var i = 0; i < trans.length; i++) {
                var t = trans[i];
                r.push({
                    source: t.getAttribute("sourceState"),
                    target: t.getAttribute("targetState"),
                    operation: t.getAttribute("operationName"),
                    iface: t.getAttribute("interfaceName"),
                    reqs: attrsToStrings(getMProtElements(t, "Requirement"), "name")
                });
            }
            return r;
        };
        //Returns the set of "state"'s outgoing transitions
        ManagementProtocol.prototype.getOutgoingTransitions = function (state) {
            var trans = this.getTransitions();
            for (var i = 0; i < trans.length; i++) {
                if (trans[i].source != state) {
                    trans.splice(i, 1);
                    i--;
                }
            }
            return trans;
        };
        return ManagementProtocol;
    })();
    _ManagementProtocol.ManagementProtocol = ManagementProtocol;
    var ManagementProtocolEditor = (function (_super) {
        __extends(ManagementProtocolEditor, _super);
        function ManagementProtocolEditor(doc, name, onend) {
            _super.call(this, null);
            this.doc = doc;
            var that = this;
            var findNodeType = function () {
                var nts = doc.get("NodeType");
                for (var i = 0; i < nts.length; i++) {
                    var nt = nts[i];
                    if (nt.getAttribute("name") == name)
                        return nt;
                }
                throw "Did not find NodeType " + name;
            };
            var init = function () {
                var defs = doc.doc.firstChild;
                defs.setAttribute("xmlns:mprot", mprotNS);
                that.save(function () {
                    doc.reload(function () {
                        that.reset(findNodeType());
                        if (onend)
                            onend();
                    });
                });
            };
            this.reset(findNodeType());
            if (!this.mprot)
                init();
            else if (onend)
                onend();
        }
        ManagementProtocolEditor.prototype.save = function (onend) {
            this.doc.save(onend);
        };
        ManagementProtocolEditor.prototype.getXML = function () {
            return this.doc.getXML();
        };
        return ManagementProtocolEditor;
    })(ManagementProtocol);
    _ManagementProtocol.ManagementProtocolEditor = ManagementProtocolEditor;
})(ManagementProtocol || (ManagementProtocol = {}));
