import { ResourceResponse, ResourceProtocol, ResourceManager, ResourceRequest } from '../resource-manager';
import { Message, SynchronizedMessage, MessageQueue } from '../message';
import { IMemoryCacheMessage, MemoryCache } from '../memory-cache';
import { MemoryCacheListener } from './memory-cache.listener';
import { ComponentListeners } from './component-listeners';
import { ResourceListener } from './resource.listener';
import { MessageListener } from './message.listener';

describe('ComponentListeners', () => {
    class TestComponent {
        public lastMessage: Message | undefined;
        public lastValue: any;
        public lastResponse: any;

        public onInit(): void {
            ComponentListeners.set(this);
        }

        public onDestroy(): void {
            ComponentListeners.destroy(this);
        }

        @MessageListener({ mask: 1, tags: ['Test1'] })
        public onMessageTest(message: Message): void {
            this.lastMessage = message;
        }

        @MemoryCacheListener({ path: (value) => value.startsWith('/User') })
        public onMemoryCache(entry: IMemoryCacheMessage): void {
            this.lastValue = entry.new;
        }

        @ResourceListener({ tags: ['Test1'] })
        public onResource(response: ResourceResponse<any>): void {
            this.lastResponse = response.responseData;
        }
    }

    let component: TestComponent | undefined;

    beforeEach(() => {
        MemoryCache.clear();
        component = new TestComponent();
        component.onInit();
    });

    afterEach(() => {
        component?.onDestroy();
        MessageQueue.destroyAllListeners();
    });

    it('should create successfully', () => {
        expect(component).toBeTruthy();
        if (component == null) return;
        expect(ComponentListeners.has(component)).toBeTrue();
        const root = ComponentListeners.get(component);
        expect(root).toBeTruthy();
        expect(root?.children.length).toEqual(3);

    });

    it('should enable and disable successfully', () => {
        if (component == null) return;
        ComponentListeners.disable(component);
        SynchronizedMessage.empty().useIdentifier(1, 'Test1').send();
        expect(component.lastMessage).toBeUndefined();
        ComponentListeners.enable(component);
        const message = SynchronizedMessage.empty().useIdentifier(1, 'Test1').send();
        expect(component.lastMessage).toEqual(message);
    });

    it('should send message successfully', () => {
        const message = SynchronizedMessage.empty().useIdentifier(1, 'Test1').send();
        SynchronizedMessage.empty().useIdentifier(2, 'Test1').send();
        expect(component?.lastMessage).toEqual(message);
    });

    it('should set memory cache successfully', async (done) => {
        await MemoryCache.set('/User/Name', 'Test1');
        await MemoryCache.set('/State/Name', 'Test2');
        expect(component?.lastValue).toEqual('Test1');
        done();
    });

    it('should send resource successfully', async (done) => {
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
        await ResourceRequest.to('storage:///User/Name').useTag('Test1').send();
        expect(component?.lastResponse).toEqual(1);
        done();
    });
});
