/// <reference path="lib/jquery/jquery.d.ts" />

module TOSCA {
    export var toscaNS = "http://docs.oasis-open.org/tosca/ns/2011/12";

    export class ToscaDocument {
        public doc: Document;

        constructor(private _load: (onend: (data: string) => void) => void,
            private _save: (data: string, onend: () => void) => void,
            onend: () => void) {
            this.reload(onend);
        }

        get(name: string) {
            return this.doc.getElementsByTagNameNS(toscaNS, name);
        }

        reload(onend: () => void) {
            var that = this;
            this._load(function (data) {
                that.doc = $.parseXML(data);
                onend();
            });
        }

        private getXMLString() {
            return new XMLSerializer().serializeToString(this.doc);
        }

        getXML() {
            return new Blob([this.getXMLString()], { type: "text/xml" });
        }

        save(onend: () => void) {
            this._save(this.getXMLString(), onend);
        }
    }

    // Finds an element (of a certain "name") inside "toscaDoc"
    export function getToscaElements(toscaDoc: Element, name: string) {
        return toscaDoc.getElementsByTagNameNS(toscaNS, name);
    }
}