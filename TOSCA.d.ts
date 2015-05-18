/// <reference path="jquery.d.ts" />
declare function parseToscaMeta(data: string): string[];
declare function parseToscaDefinitions(data: string): Element;
declare class ToscaDocument {
    private doc;
    constructor(data: string);
    get(name: string): NodeList;
}
declare function getToscaElements(toscaDoc: Element, name: string): NodeList;
declare function getInstanceStates(toscaDoc: Element): NodeList;
declare function getRequirementDefinitions(toscaDoc: Element): NodeList;
declare function getCapabilityDefinitions(toscaDoc: Element): NodeList;
declare function getOperations(toscaDoc: Element): NodeList;
declare function serializeToscaDefinitions(toscaDoc: Element): Blob;
