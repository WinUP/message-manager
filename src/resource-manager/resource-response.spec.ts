import { ResourceProtocol } from './resource-protocol';
import { ResourceResponse } from './resource-response';
import { ResourceManager } from './resource-manager';
import { ResourceRequest } from './resource-request';
import { ResponseStatus } from './response-status';

describe('ResourceResponsest', () => {
    beforeEach(() => {
        class StorageProtocol extends ResourceProtocol {
            public constructor() {
                super('storage');
            }

            public request(): Promise<any> {
                throw new Error('Method not implemented.');
            }

            public requestSync() {
                throw new Error('Method not implemented.');
            }
        }
        ResourceManager.useProtocol(new StorageProtocol());
    });

    afterEach(() => {
        ResourceManager.dropAllProtocols();
        ResourceManager.dropAllInjectors();
    });

    it('should create successfully', () => {
        const request = ResourceRequest.to('storage:///test');
        const response = new ResourceResponse(request);
        expect(response.request).toEqual(request);
        expect(response.status).toEqual(ResponseStatus.Preparing);
        response.useStatus(ResponseStatus.Sending);
        expect(response.status).toEqual(ResponseStatus.Sending);
        expect(response.responseData).toBeUndefined();
        response.responseData = 1;
        expect(response.responseData).toEqual(1);
    });
});
