/// <reference path="TOSCA.ts" />
/// <reference path="Utils.ts" />

module ManagementProtocol {
    var mprotNS = "http://di.unipi.it/~soldani/mprot";

    export interface Transition {
        source: string;
        target: string;
        iface: string;
        operation: string;
        reqs: Utils.Set;
    }

    export interface InterfaceOperation {
        iface: string;
        operation: string;
    }

    export interface FaultHandler {
        source: string;
        target: string;
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
        var r: Utils.Set = {};
        for (var i = 0; i < nodes.length; i++) {
            var el = <Element>nodes[i];
            r[el.getAttribute(attr)] = true;
        }
        return r;
    }

    function removeAll(nodes: NodeList) {
        for (var i = 0; i < nodes.length; i++)
            nodes[i].parentNode.removeChild(nodes[i]);
    }

    export function getMProtElements(node: Element, tagName: string) {
        return node.getElementsByTagNameNS(mprotNS, tagName);
    }

    export class State {
        constructor(private state: Element,
            private mprot: ManagementProtocol) { }

        private get(tagName: string) {
            return getMProtElements(this.state, tagName);
        }

        getReqs() {
            return attrsToStrings(this.get("Requirement"), "name");
        }

        getCaps() {
            return attrsToStrings(this.get("Capability"), "name");
        }

        setReqs(reqs: Utils.Set) {
            removeAll(this.get("ReliesOn"));
            var l = Object.keys(reqs);
            if (l.length != 0)
                this.state.insertBefore(createElementGroup(l, this.state.ownerDocument, "ReliesOn", "Requirement", "name"), this.state.firstChild);
        }

        setCaps(caps: Utils.Set) {
            removeAll(this.get("Offers"));
            var l = Object.keys(caps);
            if (l.length != 0)
                this.state.appendChild(createElementGroup(l, this.state.ownerDocument, "Offers", "Capability", "name"));
        }
    }

    export class ManagementProtocol {
        public mprot: Element;

        constructor(public nodeType: Element) {
            if (nodeType)
                this.reset(nodeType);
        }

        reset(nodeType: Element) {
            this.nodeType = nodeType;
            var mprots = this.getMProt("ManagementProtocol");

            if (mprots.length != 1) {
                removeAll(this.getMProt("ManagementProtocol"));
                this.mprot = nodeType.ownerDocument.createElementNS(mprotNS, "ManagementProtocol");
                nodeType.appendChild(this.mprot);
            } else {
                this.mprot = <Element>mprots[0];
            }

            var transitions = this.getMProt("Transitions");
            if (transitions.length != 1) {
                removeAll(transitions);
                this.mprot.appendChild(nodeType.ownerDocument.createElementNS(mprotNS, "Transitions"));
            }

            var faultHandlers = this.getMProt("FaultHandlers");
            if (faultHandlers.length != 1) {
                removeAll(faultHandlers);
                this.mprot.appendChild(nodeType.ownerDocument.createElementNS(mprotNS, "FaultHandlers"));
            }

            var initialStates = this.getMProt("InitialState");
            if (initialStates.length != 1)
                this.setInitialState(Object.keys(this.getStates())[0]);
        }

        // normalize() {
        //     var states = this.getStates();

        //     // normalize transitions
        //     var trans = this.getMProt("Transition");
        //     for (var i = 0; i < trans.length; i++) {
        //         var t = <Element>trans[i];
        //         var source = states[t.getAttribute("sourceState")];
        //         var target = states[t.getAttribute("targetState")];
        //         var minReqs = Utils.setUnion(source.getReqs(), target.getReqs());
        //         var reqs = attrsToStrings(getMProtElements(t, "Requirement"), "name");
        //         if (!Utils.setContains(reqs, minReqs)) {
        //             removeAll(getMProtElements(t, "ReliesOn"));
        //             var reqList = Object.keys(Utils.setUnion(reqs, minReqs));
        //             t.appendChild(createElementGroup(reqList, this.nodeType.ownerDocument, "ReliesOn", "Requirement", "name"));
        //         }
        //     }
        // }

        private getTosca(tagName: string) {
            return TOSCA.getToscaElements(this.nodeType, tagName);
        }

        getMProt(tagName: string) {
            return getMProtElements(this.nodeType, tagName);
        }

        getReqs() {
            return attrsToStrings(this.getTosca("RequirementDefinition"), "name");
        }

        getCaps() {
            return attrsToStrings(this.getTosca("CapabilityDefinition"), "name");
        }

        getStates() {
            var r: Utils.Map<State> = {};
            var states = this.getTosca("InstanceState");
            for (var i = 0; i < states.length; i++) {
                var el = <Element>states[i];
                r[el.getAttribute("state")] = new State(el, this);
            }

            return r;
        }

        getOps() {
            var r: InterfaceOperation[] = [];
            var ops = this.getTosca("Operation");
            for (var i = 0; i < ops.length; i++) {
                var op = <Element>ops[i];
                var iface = <Element>op.parentNode;
                r.push({
                    operation: op.getAttribute("name"),
                    iface: iface.getAttribute("name")
                });
            }
            return r;
        }

        getInitialState() {
            var state = <Element>this.getMProt("InitialState")[0];
            return state.getAttribute("state");
        }

        setInitialState(state: string) {
            removeAll(this.getMProt("InitialState"));

            var stateNode = this.nodeType.ownerDocument.createElementNS(mprotNS, "InitialState");
            stateNode.setAttribute("state", state);
            this.mprot.insertBefore(stateNode, this.mprot.firstChild);
        }

        findTransition(newT: Transition) {
            var trans = this.getMProt("Transition");
            for (var i = 0; i < trans.length; i++) {
                var t = <Element>trans[i];
                if (t.getAttribute("sourceState") == newT.source &&
                    t.getAttribute("targetState") == newT.target &&
                    t.getAttribute("interfaceName") == newT.iface &&
                    t.getAttribute("operationName") == newT.operation &&
                    Utils.setEquals(attrsToStrings(getMProtElements(t, "Requirement"), "name"), newT.reqs)) {
                    return t;
                }
            }

            return null;
        }

        addTransition(newT: Transition) {
            if (this.findTransition(newT))
                throw "Transiiton already in protocol";

            var t = this.nodeType.ownerDocument.createElementNS(mprotNS, "Transition");
            t.setAttribute("sourceState", newT.source);
            t.setAttribute("targetState", newT.target);
            t.setAttribute("operationName", newT.operation);
            t.setAttribute("interfaceName", newT.iface);
            var reqList = Object.keys(newT.reqs);
            if (reqList.length > 0)
                t.appendChild(createElementGroup(reqList, this.nodeType.ownerDocument, "ReliesOn", "Requirement", "name"));

            this.getMProt("Transitions")[0].appendChild(t);
        }

        removeTransition(trans: Transition) {
            var t = this.findTransition(trans);
            t.parentNode.removeChild(t);
        }

        getTransitions() {
            var r: Transition[] = [];
            var trans = this.getMProt("Transition");
            for (var i = 0; i < trans.length; i++) {
                var t = <Element>trans[i];
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

        // Returns the set of "state"'s outgoing transitions
        getOutgoingTransitions(state: string) {
            return this.getTransitions().filter(function (t) { return t.source == state; });
        }

        findFaultHandler(h: FaultHandler) {
            var faults = this.getMProt("FaultHandler");
            for (var i = 0; i < faults.length; i++) {
                var t = <Element>faults[i];
                if (t.getAttribute("sourceState") == h.source &&
                    t.getAttribute("targetState") == h.target) {
                    return t;
                }
            }

            return null;
        }

        addFaultHandler(h: FaultHandler) {
            if (this.findFaultHandler(h))
                throw "Fault handler already in protocol";

            var t = this.nodeType.ownerDocument.createElementNS(mprotNS, "FaultHandler");
            t.setAttribute("sourceState", h.source);
            t.setAttribute("targetState", h.target);

            this.getMProt("FaultHandlers")[0].appendChild(t);
        }

        removeFaultHandler(h: FaultHandler) {
            var t = this.findFaultHandler(h);
            t.parentNode.removeChild(t);
        }

        getFaultHandlers() {
            var r: FaultHandler[] = [];
            var trans = this.getMProt("FaultHandler");
            for (var i = 0; i < trans.length; i++) {
                var t = <Element>trans[i];
                r.push({
                    source: t.getAttribute("sourceState"),
                    target: t.getAttribute("targetState")
                });
            }
            return r;
        }
    }

    export class ManagementProtocolEditor extends ManagementProtocol {
        constructor(private doc: TOSCA.ToscaDocument,
            name: string,
            onend: () => void) {
            super(null);

            var that = this;

            var findNodeType = function () {
                var nts = doc.get("NodeType");

                for (var i = 0; i < nts.length; i++) {
                    var nt = <Element>nts[i];
                    if (nt.getAttribute("name") == name)
                        return nt;
                }

                throw "Did not find NodeType " + name;
            }

            var init = function () {
                var defs = <Element>doc.doc.firstChild;
                defs.setAttribute("xmlns:mprot", mprotNS);

                that.save(function () {
                    doc.reload(function () {
                        that.reset(findNodeType());
                        if (onend)
                            onend();
                    });
                });
            }

            this.reset(findNodeType());

            if (!this.mprot)
                init();
            else if (onend)
                onend();
        }

        save(onend: () => void) {
            this.doc.save(onend);
        }

        getXML() {
            return this.doc.getXML();
        }
    }
}
