import { ResourceManager, RequestInjector } from './resource-manager';
import { MessageQueue, Listener } from '../message';
import { InjectorTimepoint } from './injector-timepoint';
import { ResourceProtocol } from './resource-protocol';
import { ResourceResponse } from './resource-response';
import { ResourceRequest } from './resource-request';
import { RequestMode } from './request-mode';

describe('ResourcManager', () => {
    beforeEach(() => {
        class StorageProtocol extends ResourceProtocol {
            public constructor() {
                super('storage');
            }

            public async request(): Promise<any> {
                return 1;
            }

            public requestSync() {
                return -1;
            }
        }
        ResourceManager.useProtocol(new StorageProtocol());
    });

    afterEach(() => {
        ResourceManager.dropAllProtocols();
        ResourceManager.dropAllInjectors();
    });

    it('should register and unregister protocol successfully', () => {
        expect(ResourceManager.findProtocol('storage')).toBeTruthy();
        ResourceManager.dropProtocol('storage');
        expect(ResourceManager.findProtocol('storage')).toBeFalsy();
    });

    it('should send synchronized data successfully', () => {
        expect(ResourceManager.send<number>(ResourceRequest.to('storage:///test'), RequestMode.Synchronized).responseData).toEqual(-1);
    });

    it('should send asynchronized data successfully', (done) => {
        ResourceManager.send<number>(ResourceRequest.to('storage:///test'), RequestMode.Asynchronized).then(response => {
            expect(response.responseData).toEqual(1);
            done();
        });
    });

    it('should send via message service successfully', (done) => {
        MessageQueue.receive(Listener
            .once(ResourceManager.config.response.mask, ResourceManager.config.response.tag)
            .useReceiver(message => {
                expect((message.value as ResourceResponse<number>).responseData).toEqual(1);
                done();
            }));
        ResourceManager.send<number>(ResourceRequest.to('storage:///test'));
    });

    it('should call injector when sending data in synchronized mode', () => {
        const injector: RequestInjector = (request, response, timepoint) => {
            response.responseData = 2;
        };
        ResourceManager.useInjector(injector, InjectorTimepoint.OnSucceed);
        expect(ResourceManager.send<number>(ResourceRequest.to('storage:///test'), RequestMode.Synchronized).responseData).toEqual(2);
    });

    it('should call injector when sending data in asynchronized mode', (done) => {
        const injector: RequestInjector = (_request, response) => {
            response.responseData = 2;
        };
        ResourceManager.useInjector(injector, InjectorTimepoint.OnSucceed);
        ResourceManager.send<number>(ResourceRequest.to('storage:///test'), RequestMode.Asynchronized).then(response => {
            expect(response.responseData).toEqual(2);
            done();
        });
    });

    it('should throw error when injector returns promise in synchronized mode', () => {
        const injector: RequestInjector = async (_request, response) => {
            response.responseData = 2;
        };
        ResourceManager.useInjector(injector, InjectorTimepoint.OnSucceed);
        expect(() => ResourceManager.send<number>(ResourceRequest.to('storage:///test'), RequestMode.Synchronized)).toThrowError();
    });
});
