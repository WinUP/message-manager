
/**
 * Test regexp with source when tester is regexp, or equals to source when tester is string
 * @param tester Tester
 * @param source Source
 * @description If tester is null/undefined or empty string, function will return true.
 * If source is null/undefined or empty string, function will return false.
 */
export function isMatch(tester: (string | RegExp) | null | undefined, source: string | null | undefined): boolean {
    if (!tester || tester === '') {
        return true;
    }
    if (!source || source === '') {
        return false;
    }
    return typeof tester === 'string' ? tester === source : tester.test(source);
}
