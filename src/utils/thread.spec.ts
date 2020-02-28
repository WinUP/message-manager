import { Thread } from './thread';

describe('Thread', () => {
    it('should create successfully', (done) => {
        const thread = new Thread<number, string>(data => `${data}`);
        thread.computed = (success, data) => {
            expect(success).toBeTrue();
            expect(data).toEqual('1');
            done();
        };
        thread.compute(1);
    });
});
