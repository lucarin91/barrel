/// <reference path="lib/zip-fs.js.d.ts" />
/// <reference path="TOSCA.ts" />
/// <reference path="lib/path.js.d.ts" />

module Csar {
    declare function unescape(s: string): string;

    export interface Map<T> { [path: string]: T; }

    export interface FileNode {
	doc: ToscaDocument;
	element: Node;
    }

    export class Csar {
	private fs = new zip.fs.FS();
	private entryDef: string;
	private docs: Map<ToscaDocument> = {};

	constructor(blob: Blob, onend: () => void) {
	    var that = this;
	    var locations: string[] = [];

	    var relativePath = function(base: string, location: string) {
		var pathElements = base.split("/");
		pathElements.pop();
		pathElements = pathElements.concat(location.split("/"));
		var j = 0;
		for (var i = 0; i < pathElements.length; i++) {
		    if (pathElements[i] == "..")
			j--;
		    else if (pathElements[i] != ".")
			pathElements[j++] = pathElements[i];
		}
		return pathElements.slice(0, j).join("/");
	    }

	    var parseToscaDocuments = function() {
		if (locations.length == 0)
		    return onend();

		var fileName = locations.pop();

		var load = function (onend: (text: string) => void) {
		    var file = <zip.fs.ZipFileEntry> that.fs.find(fileName);
		    file.getText(onend);
		}
		var save = function (text: string, onend: () => void) {
		    var file = <zip.fs.ZipFileEntry> that.fs.find(fileName);
		    that.fs.remove(file);
		    var pathElements = fileName.split("/");
		    var name = pathElements.pop();
		    var dir = <zip.fs.ZipDirectoryEntry> that.fs.find(pathElements.join("/"));
		    dir.addText(name, text);
		    onend();
		}

		var doc: ToscaDocument;
		var parseDoc = function () {
		    that.docs[fileName] = doc;
		    var imports = doc.get("Import");
		    for (var i = 0; i < imports.length; i++) {
			var location = (<Element> imports[i]).getAttribute("location");
			if (!(location in that.docs))
			    locations.push(relativePath(fileName, unescape(location)));
		    }
		    parseToscaDocuments();
		}

		doc = new ToscaDocument(load, save, parseDoc);
	    }

	    var parseToscaMeta = function(data: string) {
		that.entryDef = /Entry-Definitions: *(.*)/.exec(data)[1];
		locations.push(that.entryDef);
		parseToscaDocuments();
	    }

	    var parseCsar = function() {
		var file = <zip.fs.ZipFileEntry> that.fs.find("TOSCA-Metadata/TOSCA.meta");
		file.getText(parseToscaMeta);
	    }

	    this.fs.importBlob(blob, parseCsar);
	}

	public get(name: string) {
	    var r: FileNode[] = [];
	    for (var d in this.docs) {
		var els = this.docs[d].get(name);
		for (var i = 0; i < els.length; i++) {
		    r.push({ doc: this.docs[d], element: els[i] });
		}
	    }
	    return r;
	}
	
	public exportBlob(onend: (blob: Blob) => void) {
	    this.fs.exportBlob(onend);
	}
    }
}
