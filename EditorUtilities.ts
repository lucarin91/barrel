module EditorUtilities {
    export interface Map<T> { [id: string]: T; }
    export class Target {
        public nodeId: string;
        public nodeName: string;
        public cap: string;
        constructor() { }
    }
    export class Node {
        public name: string;
        public type: string;
        public caps: Map<string>;
        public reqs: Map<Target>;

        constructor() { this.caps = {}; this.reqs = {} }
    }

    /**
     * This function parses the "service" element and returns a Map<Node> where all nodes have
     * their requirements targeting the nodes' capabilities satisfying them.
     * @param service
     */
    export function parseTopology(service: Element) {
        // Getting topology nodes
        var nodes: Map<Node> = {};
        var nodeTemps: NodeListOf<Element> = service.getElementsByTagName("NodeTemplate");
        for (var i = 0; i < nodeTemps.length; i++) {
            var nT: Element = nodeTemps[i];
            var n: Node = new Node();
            // Node name
            n.name = nT.getAttribute("name");
            // Node type
            n.type = nT.getAttribute("type");
            if (n.type.indexOf(":") > -1) n.type = n.type.split(":")[1];
            // Node capabilities
            var caps: NodeListOf<Element> = nT.getElementsByTagName("Capability");
            for (var j = 0; j < caps.length; j++)
                n.caps[caps[j].getAttribute("name")] = caps[j].id;
            // Node requirements
            var reqs: NodeListOf<Element> = nT.getElementsByTagName("Requirement")
            for (var j = 0; j < reqs.length; j++)
                n.reqs[reqs[j].getAttribute("name")] = new Target();
            nodes[nT.id] = n;
        }

        // Adding bindings to node's requirements
        var relTemps: NodeListOf<Element> = service.getElementsByTagName("RelationshipTemplate");
        for (var i = 0; i < relTemps.length; i++) {
            var rT: Element = relTemps[i];

            // Source-Target references
            var sRef: string = rT.getElementsByTagName("SourceElement")[0].getAttribute("ref");
            var tRef: string = rT.getElementsByTagName("TargetElement")[0].getAttribute("ref");

            // Source node-req
            var sNodeId: string = rT.ownerDocument.getElementById(sRef).parentElement.parentElement.id;
            var sNodeName: string = rT.ownerDocument.getElementById(sRef).parentElement.parentElement.getAttribute("name");
            var sReq: string = rT.ownerDocument.getElementById(sRef).getAttribute("name");

            // Target node-cap
            var tNodeId: string = rT.ownerDocument.getElementById(tRef).parentElement.parentElement.id;
            var tNodeName: string = rT.ownerDocument.getElementById(tRef).parentElement.parentElement.getAttribute("name");
            var tCap: string = rT.ownerDocument.getElementById(tRef).getAttribute("name");

            // Add binding from source node-req to target node-cap
            nodes[sNodeId].reqs[sReq] = { nodeId: tNodeId, nodeName: tNodeName, cap: tCap };
        }

        return nodes;
    }

    /**
     * This function sorts the takes a Map<Node> and computes a topological sort
     * according to the requirments and to the capabilties they target.
     * @param nodes
     */
    export function sortNodes(nodes: Map<Node>) {
        // Create an utility map where to store the depth of each node
        // (initially, all nodes are assumed to have depth 0).
        var depths: Map<number> = {};
        for (var n in nodes) depths[n] = 0;

        // Iterate until no change is issued on the map of depths
        var changed: boolean = true;
        while (changed) {
            changed = false;
            for (var n in nodes) {
                // If a requirement of node n is satisfied by a node whose depth (+1)
                // is higher than that of n, updated the depth of n
                for (var r in nodes[n].reqs) {
                    var rDepth = depths[nodes[n].reqs[r].nodeId];
                    if (depths[n] < rDepth + 1) {
                        depths[n] = rDepth + 1;
                        changed = true;
                    }
                }
            }
        }

        // Return an array whose item "i" is an array containing all nodes of depth "i"
        var sortedNodes = new Array<Array<Node>>();
        for (var n in depths) {
            if (!sortedNodes[depths[n]])
                sortedNodes[depths[n]] = new Array<Node>();
            sortedNodes[depths[n]].push(nodes[n]);
        }
        return sortedNodes;
    }
}