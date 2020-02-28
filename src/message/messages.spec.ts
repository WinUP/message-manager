import { SynchronizedMessage, AsynchronizedMessage } from './messages';

describe('Messages', () => {
    it('should create synchronized message successfully', () => {
        const message = SynchronizedMessage.empty().useIdentifier(1, 'Test1').useValue(0);
        expect(message).toBeTruthy();
        expect(message.isSynchronized).toBeTrue();
        expect(message.mask).toEqual(1);
        expect(message.tag).toEqual('Test1');
        expect(message.value).toEqual(0);
    });

    it('should create asynchronized message successfully', () => {
        const message = AsynchronizedMessage.empty().useIdentifier(1, 'Test1').useValue(0);
        expect(message).toBeTruthy();
        expect(message.isSynchronized).toBeFalse();
        expect(message.mask).toEqual(1);
        expect(message.tag).toEqual('Test1');
        expect(message.value).toEqual(0);
    });

    it('should convert synchronized message to asynchronized message successfully', () => {
        const message = SynchronizedMessage.empty().useIdentifier(1, 'Test1').useValue(0).toAsynchronized();
        expect(message).toBeTruthy();
        expect(message.isSynchronized).toBeFalse();
        expect(message.mask).toEqual(1);
        expect(message.tag).toEqual('Test1');
        expect(message.value).toEqual(0);
    });

    it('should convert asynchronized message to synchronized message successfully', () => {
        const message = AsynchronizedMessage.empty().useIdentifier(1, 'Test1').useValue(0).toSynchronized();
        expect(message).toBeTruthy();
        expect(message.isSynchronized).toBeTrue();
        expect(message.mask).toEqual(1);
        expect(message.tag).toEqual('Test1');
        expect(message.value).toEqual(0);
    });

    it('should send synchronized message successfully', () => {
        const message = SynchronizedMessage.empty().useIdentifier(1, 'Test1').useValue(0).send();
        expect(message).toBeTruthy();
        expect(message.isSynchronized).toBeTrue();
        expect(message.mask).toEqual(1);
        expect(message.tag).toEqual('Test1');
        expect(message.value).toEqual(0);
    });

    it('should send asynchronized message successfully', async (done) => {
        const promise = AsynchronizedMessage.empty().useIdentifier(1, 'Test1').useValue(0).send();
        expect(promise).toBeInstanceOf(Promise);
        const message = await promise;
        expect(message).toBeTruthy();
        expect(message.isSynchronized).toBeFalse();
        expect(message.mask).toEqual(1);
        expect(message.tag).toEqual('Test1');
        expect(message.value).toEqual(0);
        done();
    });
});
