import { callStack } from './call-stack';

describe('callStack', () => {
    it('should get correct callstack', () => {
        const data = callStack();
        expect(data.length).toBeGreaterThan(1);
        const record = data[0];
        expect(record.line).toEqual(5);
        expect(record.position).toEqual(22);
        expect(record.fileName).toMatch(/.+call-stack\.spec\.ts/);
        expect(record.identifiers.length).toBeGreaterThan(0);
    });
});
