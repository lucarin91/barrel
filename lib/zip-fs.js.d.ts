// Type definitions for zip.js 2.x
// Project: https://github.com/gildas-lormeau/zip.js
// Definitions by: Louis Grignon <https://github.com/lgrignon>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

interface FileEntry {}

declare module zip.fs {
    export class FS {
	public root: ZipDirectoryEntry;
	constructor();
	public importBlob(blob: Blob, onend?: () => void, onerror?: () => void): void;
	public importData64URI(dataURI: string, onend?: () => void, onerror?: () => void): void;
	public importHttpContent(URL: string, useRangeHeader: boolean, onend?: () => void, onerror?: () => void): void;
	public exportBlob(onend: (blob: Blob) => void, onprogress?: () => void, onerror?: () => void): void;
	public exportData64URI(onend: (uri: string) => void, onprogress?: () => void, onerror?: () => void): void;
	public exportFileEntry(fileEntry: FileEntry, onend: (fileEntry: FileEntry) => void, onprogress?: () => void, onerror?: () => void): void;
	public getById(id: number): ZipEntry;
	public find(fullname: string): ZipEntry;
	public remove(zipEntry: ZipEntry): void;
	
    }

    export class ZipEntry {
	public name: string;
	public directory: boolean;
	public children: ZipEntry[];
	public id: number;

	constructor();
	public getFileEntry(fileEntry: FileEntry, onend: () => void, onprogress?: () => void, onerror?: () => void): void;
	public moveTo(directory: ZipDirectoryEntry): void;
	public getFullname(): string;
	public isDescendantOf(ancestor: ZipDirectoryEntry): boolean;
    }

    export class ZipFileEntry extends ZipEntry {
	constructor();
	public getText(callback: (data: string) => void, checkCrc32?: boolean): string;
	public getBlob(mimeType: string, callback: () => void, checkCrc32?: boolean): Blob;
	public getData64URI(mimeType: string, callback: () => void, checkCrc32?: boolean): string;
    }

    export class ZipDirectoryEntry extends ZipEntry {
	constructor();
	public addBlob(name: string, blob: Blob): void;
	public addText(name: string, text: string): void;
	public addData64URI(name: string, dataURI: string): void;
	public addHttpContent(name: string, URL: string, size: number, useRangeHeader: boolean): void;
	// TODO
	public getChildByName(name: string): ZipEntry;
    }
}
