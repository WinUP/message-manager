import { SerializableNode, autoname, toPascalCase } from '@dlcs/tools';

import { MessageService } from '../message/message.service';

/**
 * Configuration keys for MemoryCache
 */
export interface IMemoryCacheConfigKeys {
    /**
     * OnAction and MessageService intergration configuration
     */
    action: {
        /**
         * Message mask
         * @default 1
         */
        mask: string;
        /**
         * Message tag
         * @default 'ACTION'
         */
        tag: string;
        /**
         * Data share tag
         * @default 'MEMORY_CACHE_SHARE'
         */
        shareTag: string;
    };
}

/**
 * Message structure for memory cache changes via ```MessageService```
 */
export interface IMemoryCacheMessage<T = any, U = T> {
    /**
     * Cache's key
     */
    key: string;
    /**
     * Cache's old value
     */
    old: T;
    /**
     * Cache's new value
     */
    new: U;
}

export class MemoryCache {
    private store: { [key: string]: any } = {};
    private static _config: SerializableNode = SerializableNode.create('ResourceManager', undefined);
    private static _configKeys: IMemoryCacheConfigKeys = { action: { mask: '', tag: '', shareTag: '' } };
    private injectors: ((key: string, value: any) => any)[] = [];

    public static initialize(): void {
        autoname(MemoryCache._configKeys, '/', toPascalCase);
        SerializableNode.set(MemoryCache.config, MemoryCache.configKeys.action.mask, 1);
        SerializableNode.set(MemoryCache.config, MemoryCache.configKeys.action.tag, 'ACTION');
        SerializableNode.set(MemoryCache.config, MemoryCache.configKeys.action.shareTag, 'MEMORY_CACHE_SHARE');
    }

    public constructor(private messageService: MessageService) {
        this.messageService.listener
            .hasPriority(Number.MAX_SAFE_INTEGER)
            .for(
                SerializableNode.get(MemoryCache.config, MemoryCache.configKeys.action.mask)
            ).listen(
                SerializableNode.get(MemoryCache.config, MemoryCache.configKeys.action.shareTag)
            ).receiver(message => {
                if (!message.isCrossShare) { return message; }
                const data: IMemoryCacheMessage = message.value;
                this.set(data.key, data.new, true, false);
                return message;
            }).register();
    }

    /**
     * Get configuration
     */
    public static get config(): SerializableNode {
        return MemoryCache._config;
    }

    /**
     * Get configuration keys
     */
    public static get configKeys(): Readonly<IMemoryCacheConfigKeys> {
        return MemoryCache._configKeys;
    }

    /**
     * Register injector
     * @param injector Target injector. Injector will be called before store any value, the returned value will be used
     * as real value to store.
     */
    public inject(injector: (key: string, value: any) => any): void {
        if (!this.injectors.includes(injector)) {
            this.injectors.push(injector);
        }
    }

    /**
     * Get cached item
     * @param key Cached item's key
     */
    public get<T = any>(key: string): T | undefined {
        return this.store[key];
    }

    /**
     * Indicate if cached item is not undefined
     * @param key Cached item's key
     */
    public has(key: string): boolean {
        return this.store[key] !== undefined;
    }

    /**
     * Set cached item's value or create new cache item. If delete the item, please set its value to ```undefined```.
     * @param key Item key
     * @param value New value
     * @param ignoreInjector Should ignore all injectors when store this value
     * @param share Should push to application's other instance if ```MessageService```'s cross share is enabled
     */
    public set<T>(key: string, value: T, ignoreInjector?: boolean, share?: boolean): void {
        const oldValue = this.store[key];
        if (!ignoreInjector) {
            this.injectors.forEach(injector => value = injector(key, value));
        }
        this.store[key] = value;
        this.messageService.asyncMessage.mark(
            SerializableNode.get(MemoryCache.config, MemoryCache.configKeys.action.mask),
            SerializableNode.get(MemoryCache.config, MemoryCache.configKeys.action.tag)
        ).use<IMemoryCacheMessage>({ key: key, old: oldValue, new: value }).ignoreCrossShare().send();
        if (share) {
            this.messageService.asyncMessage.mark(
                SerializableNode.get(MemoryCache.config, MemoryCache.configKeys.action.mask),
                SerializableNode.get(MemoryCache.config, MemoryCache.configKeys.action.shareTag)
            ).use<IMemoryCacheMessage>({ key: key, old: oldValue, new: value }).send();
        }
    }
}

MemoryCache.initialize();
