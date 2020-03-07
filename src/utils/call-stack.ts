/**
 * Return call stack
*/
export function callStack(): ICallStackItem[] {
    const stackInfo = new Error().stack;
    if (!stackInfo) { return []; }
    return stackInfo.split('\n').slice(2).map((v: string): ICallStackItem => {
        if (v.indexOf(':') > 0 && v.indexOf('(') > 0) { // at Module._compile (module.js:660:30)
            const source = /at ([^\(]+) \((.+):(\d+):(\d+)\)/g.exec(v.trim());
            if (!source) { return emptyLine(v); }
            return {
                identifiers: source[1].split('.'),
                fileName: source[2],
                line: +source[3],
                position: +source[4]
            };
        } else if (v.indexOf(':') > 0) { // at bootstrap_node.js:662:3
            const source = /at ([^\s]+):(\d+):(\d+)/g.exec(v.trim());
            if (!source) { return emptyLine(v); }
            return {
                identifiers: [],
                fileName: source[1],
                line: +source[2],
                position: +source[3]
            };
        } else { // Safari
            return emptyLine(v);
        }
    });
}

function emptyLine(content: string): ICallStackItem {
    return {
        identifiers: content.split('.'),
        fileName: '',
        line: -1,
        position: -1
    };
}

/**
 * Call stack information
*/
export interface ICallStackItem {
    /**
     * Identifiers
    */
    identifiers: string[];
    /**
     * Source file name
    */
    fileName: string;
    /**
     * Line in file
    */
    line: number;
    /**
     * Position in line
    */
    position: number;
}
