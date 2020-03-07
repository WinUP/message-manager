import { SynchronizedMessage, Message } from './messages';
import { Listener } from './listener';

describe('Listener', () => {
    it('should create successfully', () => {
        const listener = Listener.on(1, 'Test1', 'Test2').usePriority(100).useReceiver(m => m);
        expect(listener.priority).toEqual(100);
        expect(listener.mask).toEqual(1);
        expect(listener.tags).toBeTruthy();
        expect(listener.onlyOnce).toBeFalse();
        expect(listener.tags.size).toEqual(2);
        expect(listener.tags.has('Test1')).toBeTrue();
        expect(listener.tags.has('Test2')).toBeTrue();
        expect(listener.tags.has('Test3')).toBeFalse();
        listener.useAllTags();
        expect(listener.tags.size).toEqual(0);
        listener.asOnce();
        expect(listener.onlyOnce).toBeTrue();
    });

    it('should sync data between listener and node after registerd', () => {
        const listener = Listener.on(1).usePriority(100).useReceiver(m => m);
        const node = listener.register();
        expect(node.content).toEqual(listener);
        expect(node.enabled).toEqual(true);
        expect(node.priority).toEqual(100);
        listener.enabled = false;
        listener.priority = 101;
        expect(listener.enabled).toEqual(false);
        expect(listener.priority).toEqual(101);
        expect(node.enabled).toEqual(false);
        expect(node.priority).toEqual(101);
        listener.destroy();
        listener.enabled = true;
        listener.priority = 102;
        expect(listener.enabled).toEqual(true);
        expect(listener.priority).toEqual(102);
        expect(node.enabled).toEqual(false);
        expect(node.priority).toEqual(101);
    });

    it('should return correct answer of canParse', () => {
        const listener = Listener.on(1, 'Test1', 'Test2').usePriority(100).useReceiver(m => m);
        expect(listener.canParse(0)).toBeFalse();
        expect(listener.canParse(1)).toBeTrue();
        expect(listener.canParse(2)).toBeFalse();
        expect(listener.canParse(3)).toBeTrue();
        expect(listener.canParse(0, 'Test1')).toBeFalse();
        expect(listener.canParse(0, 'Test2')).toBeFalse();
        expect(listener.canParse(0, 'Test3')).toBeFalse();
        expect(listener.canParse(1, 'Test1')).toBeTrue();
        expect(listener.canParse(1, 'Test2')).toBeTrue();
        expect(listener.canParse(1, 'Test3')).toBeFalse();
    });

    it('should return correct message', () => {
        const testMessage1 = SynchronizedMessage.empty();
        const testMessage2 = SynchronizedMessage.empty();
        const listener = Listener.on(1).useReceiver(() => testMessage2);
        expect(listener.parse(testMessage1)).toEqual(testMessage2);
    });

    it('should return original message if receiver returns nothing', () => {
        const testMessage1 = SynchronizedMessage.empty();
        const listener = Listener.on(1).useReceiver(() => { });
        expect(listener.parse(testMessage1)).toEqual(testMessage1);
    });

    it('should return correct message in asynchronized context', (done) => {
        const testMessage1 = SynchronizedMessage.empty();
        const testMessage2 = SynchronizedMessage.empty();
        const listener = Listener.on(1).useReceiver(async () => testMessage2);
        const result = listener.parse(testMessage1);
        expect(result).toBeInstanceOf(Promise);
        (result as Promise<Message>).then(m => {
            expect(m).toEqual(testMessage2);
            done();
        });
    });

    it('should return original message if receiver returns nothing in asynchronized context', (done) => {
        const testMessage1 = SynchronizedMessage.empty();
        const listener = Listener.on(1).useReceiver(async () => { });
        const result = listener.parse(testMessage1);
        expect(result).toBeInstanceOf(Promise);
        (result as Promise<Message>).then(m => {
            expect(m).toEqual(testMessage1);
            done();
        });
    });
});
