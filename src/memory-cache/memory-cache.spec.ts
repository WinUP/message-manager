import { MemoryCache, IMemoryCacheMessage } from './memory-cache';
import { MessageQueue, Listener } from '../message';
import { SerializableNode } from '../utils';

describe('MemoryCache', () => {
    beforeEach(() => {
        MemoryCache.clear();
    });

    afterEach(() => {
        MessageQueue.destroyAllListeners();
    })

    it('should store correct data', (done) => {
        const path = '/User/MainRecord/Username';
        expect(MemoryCache.has(path)).toBeFalse();
        MessageQueue.receive(Listener
            .once(MemoryCache.config.mask, MemoryCache.config.tags.onSet)
            .useReceiver(message => {
                const data: IMemoryCacheMessage<any, any> = message.value;
                expect(data.path).toEqual(path);
                expect(data.old).toBeUndefined();
                expect(data.new).toEqual('Test1');
                done();
            }));
        MemoryCache.set(path, 'Test1');
        expect(MemoryCache.get<string>(path)).toEqual('Test1');
        expect(MemoryCache.has(path)).toBeTrue();
    });

    it('should dump and restore successfully', (done) => {
        const path = '/User/MainRecord/Username';
        MemoryCache.set(path, 'Test1');
        const data = MemoryCache.dump();
        MemoryCache.clear();
        MessageQueue.receive(Listener
            .once(MemoryCache.config.mask, MemoryCache.config.tags.onRestore)
            .useReceiver(message => {
                const content: SerializableNode = message.value;
                expect(content.get(path)).toEqual('Test1');
                done();
            }));
        MemoryCache.restore(data);
        expect(MemoryCache.get<string>(path)).toEqual('Test1');
        expect(MemoryCache.has(path)).toBeTrue();
    });
});
