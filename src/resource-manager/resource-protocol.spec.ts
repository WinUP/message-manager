import { ResourceProtocol } from './resource-protocol';
import { ResourceManager } from './resource-manager';
import { ResourceRequest } from './resource-request';

describe('ResourceProtocol', () => {
    beforeEach(() => {
        class StorageProtocol extends ResourceProtocol {
            public constructor() {
                super('storage');
            }

            public async request(): Promise<any> {
                return 1;
            }

            public requestSync() {
                return 1;
            }
        }
        ResourceManager.useProtocol(new StorageProtocol());
    });

    afterEach(() => {
        ResourceManager.dropAllProtocols();
        ResourceManager.dropAllInjectors();
    });

    it('should create successfully', () => {
        const protocol = ResourceManager.findProtocol('storage');
        expect(protocol).toBeTruthy();
        expect(protocol?.protocols.length).toEqual(1);
        expect(protocol?.protocols[0]).toEqual('storage');
    });

    it('should request data successfully', () => {
        const protocol = ResourceManager.findProtocol('storage');
        expect(protocol).toBeTruthy();
        expect(protocol?.requestSync(ResourceRequest.to('storage:///test'))).toEqual(1);
    });

    it('should request async data successfully', async (done) => {
        const protocol = ResourceManager.findProtocol('storage');
        expect(protocol).toBeTruthy();
        const result = await protocol?.request(ResourceRequest.to('storage:///test'));
        expect(result).toEqual(1);
        done();
    });
});
