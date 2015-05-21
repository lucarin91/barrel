/// <reference path="TOSCA.ts" />
/// <reference path="Analysis.ts" />
/// <reference path="ManagementProtocols.ts" />
var TOSCAAnalysis;
(function (TOSCAAnalysis) {
    var UIData = (function () {
        function UIData(data, uiNames) {
            this.data = data;
            this.uiNames = uiNames;
        }
        return UIData;
    })();
    TOSCAAnalysis.UIData = UIData;
    function toscaString(node, tagName, attr) {
        var nodes = getToscaElements(node, tagName);
        if (nodes.length != 1)
            throw "Invalid format";
        var element = nodes[0];
        return element.getAttribute(attr);
    }
    function toscaMap(node, tagName, attr) {
        var data = {};
        var uiNames = {};
        var nodes = getToscaElements(node, tagName);
        for (var i = 0; i < nodes.length; i++) {
            var element = nodes[0];
            var v = element.getAttribute(attr);
            var id = element.id;
            data[v] = id;
            uiNames[id] = v;
        }
        return new UIData(data, uiNames);
    }
    function mergeNames(a, b) {
        var r = {};
        for (var v in a)
            r[v] = a[v];
        for (var v in b)
            r[v] = b[v];
        return r;
    }
    function mapSet(a, m) {
        var r = {};
        for (var i = 0; i < a.length; i++)
            r[m[a[i]]] = true;
        return r;
    }
    function nodeTemplateToNode(nodeTemplate, types) {
        var capNames = toscaMap(nodeTemplate, "Capability", "name");
        var reqNames = toscaMap(nodeTemplate, "Requirement", "name");
        var typeName = nodeTemplate.getAttribute("type").split(':')[1];
        var mProt = new ManagementProtocol.ManagementProtocol(types[typeName]);
        var transitionToOperation = function (t) {
            return new Analysis.Operation(t.target, mapSet(t.reqs, reqNames.data));
        };
        var states = {};
        var s = mProt.getStates();
        for (var i = 0; i < s.length; i++) {
            var state = mProt.getState(s[i]);
            var caps = mapSet(state.getCaps(), capNames.data);
            var reqs = mapSet(state.getReqs(), reqNames.data);
            var trans = mProt.getOutgoingTransitions(s[i]);
            var ops = {};
            for (var j = 0; j < trans.length; j++)
                ops[trans[j].iface + ":" + trans[j].operation] = transitionToOperation(trans[j]);
            states[s[i]] = new Analysis.State(caps, reqs, ops);
        }
        return new UIData(new Analysis.Node(states, mProt.getInitialState()), mergeNames(reqNames.uiNames, capNames.uiNames));
    }
    function serviceTemplateToApplication(serviceTemplate, types) {
        var nodeTemplates = getToscaElements(serviceTemplate, "NodeTemplate");
        var relationships = getToscaElements(serviceTemplate, "RelationshipTemplate");
        var nodes = {};
        var binding = {};
        var uiNames = {};
        for (var i = 0; i < nodeTemplates.length; i++) {
            var template = nodeTemplates[i];
            var name = template.getAttribute("name");
            var n = nodeTemplateToNode(template, types);
            nodes[template.id] = n.data;
            uiNames = mergeNames(uiNames, n.uiNames);
            if (name)
                uiNames[template.id] = name;
        }
        for (var i = 0; i < relationships.length; i++) {
            var rel = relationships[i];
            var req = toscaString(rel, "SourceElement", "ref");
            var cap = toscaString(rel, "TargetElement", "ref");
            binding[req] = cap;
        }
        return new UIData(new Analysis.Application(nodes, binding), uiNames);
    }
    TOSCAAnalysis.serviceTemplateToApplication = serviceTemplateToApplication;
})(TOSCAAnalysis || (TOSCAAnalysis = {}));
