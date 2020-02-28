import { CancelToken } from './cancel-token';

describe('CancelToken', () => {
    it('should set cancel to true when got cancelled', () => {
        const token = new CancelToken();
        expect(token).toBeTruthy();
        expect(token.cancelled).toBeFalse();
        token.cancel();
        expect(token.cancelled).toBeTrue();
    });
});
