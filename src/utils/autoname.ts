/**
 * Fill object value with object map path
 * @param source Target object
 * @param splitter Path splitter (e.g. `'/'`)
 * @param namer Function to generate name
 */
export function autoname(source: { [key: string]: any }, splitter?: string, namer?: (input: string) => string): void;
/**
 * Fill object value with object map path
 * @param source Target object
 * @param splitter Path splitter (e.g. `'/'`)
 * @param prefix Path prefix (e.g. `'storage://'`)
 * @param namer Function to generate name
 */
export function autoname(source: { [key: string]: any }, splitter?: string, prefix?: string, namer?: (input: string) => string): void;
export function autoname(source: { [key: string]: any }, splitter: string = '/', p3?: string | ((input: string) => string), p4?: (input: string) => string): void {
    const namer = typeof p3 === 'string' ? p4 : p3;
    const prefix = typeof p3 === 'string' ? p3 : '';
    Object.keys(source).forEach(key => {
        if (source[key] instanceof Array) {
            return;
        } else if (source[key] instanceof Object) {
            autoname(source[key], splitter, `${prefix}${splitter}${namer?.(key) ?? key}`, namer);
        } else if (typeof source[key] === 'string') {
            source[key] = `${prefix}${splitter}${namer?.(key) ?? key}`;
        }
    });
}

/**
 * Rename input to camel case
 * @param input Input string
 */
export function toCamelCase(input: string): string {
    return input
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (item, index) => index > 0 ? item.toUpperCase() : item.toLowerCase())
        .replace(/\s+/g, '');
}

/**
 * Rename input to pascal case
 * @param input Input string
 */
export function toPascalCase(input: string): string {
    return input
        .replace(/(?:^\w|\b\w)/g, item => item.toUpperCase())
        .replace(/\s+/g, '');
}

/**
 * Rename input to camel case
 * @param input snake string
 */
export function toSnakeCase(input: string): string {
    return input
        .replace(/(?:^\w|[A-Z]|\b\w|\b\d)/g, (item, index) => index > 0 ? `_${item.toLowerCase()}` : item.toLowerCase())
        .replace(/(?:[A-Za-z]\d)/g, item => `${item[0]}_${item[1]}`)
        .replace(/\s+/g, '');
}
