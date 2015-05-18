declare module Analyzer {
    interface Map<T> {
        [id: string]: T;
    }
    interface Set {
        [id: string]: boolean;
    }
    class Operation {
        to: string;
        reqs: Set;
        constructor(to: string, reqs: Set);
    }
    class State {
        caps: Set;
        reqs: Set;
        ops: Map<Operation>;
        constructor(caps: Set, reqs: Set, ops: Map<Operation>);
    }
    class Node {
        states: Map<State>;
        state: string;
        constructor(states: Map<State>, state: string);
    }
    class Application {
        nodes: Map<Node>;
        binding: Map<string>;
        caps: Set;
        constructor(nodes: Map<Node>, binding: Map<string>);
        private reqsSatisfied(reqs);
        isConsistent(): boolean;
        performOp(nodeId: string, opId: string): boolean;
    }
}
