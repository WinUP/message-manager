import { ResourceProtocol } from './resource-protocol';
import { ResourceManager } from './resource-manager';
import { ResourceRequest } from './resource-request';
import { RequestType } from './request-type';

describe('ResourceRequest', () => {
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
        const request = ResourceRequest
            .to('storage:///User/MainRecord/Username')
            .useContent('Test1')
            .useTag('UPDATE_USER')
            .useType(RequestType.Submit)
            .addParam({ method: 'POST' });
        expect(request.address).toEqual('/User/MainRecord/Username');
        expect(request.protocol).toEqual('storage');
        expect(request.content).toEqual('Test1');
        expect(request.params).toEqual({ method: 'POST' });
        expect(request.tags).toContain('UPDATE_USER');
        expect(request.type).toEqual(RequestType.Submit);
    });

    it('should throw error if cannot find protocol', () => {
        expect(() => ResourceRequest.to('storage2:///User/MainRecord/Username')).toThrowError();
    });
});
