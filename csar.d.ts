/// <reference path="lib/zip-fs.js.d.ts" />
/// <reference path="TOSCA.d.ts" />
/// <reference path="lib/path.js.d.ts" />
declare module Csar {
    interface Map<T> {
        [path: string]: T;
    }
    interface FileNode {
        fileName: string;
        element: Node;
    }
    class Csar {
        private fs;
        private entryDef;
        private docs;
        constructor(blob: Blob, onend: () => void);
        get(name: string): FileNode[];
        exportBlob(onend: (blob: Blob) => void): void;
    }
}
