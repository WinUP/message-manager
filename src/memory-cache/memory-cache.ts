import { SerializableNode, ISerializableNode } from '@dlcs/tools';

import { MessageQueue } from '../message/message-queue';

/**
 * Configurations for MemoryCache
 */
export interface IMemoryCacheConfig {
    /**
     * OnAction and MessageService intergration configuration
     */
    action: {
        /**
         * Message mask (default 1)
         */
        mask: number;
        /**
         * Message tag (default 'ACTION')
         */
        tag: string;
        /**
         * Data restore tag (default 'MEMORY_CACHE_RESTORE')
         */
        restoreTag: string;
    };
}

/**
 * Message structure for memory cache changes via ```MessageService```
 */
export interface IMemoryCacheMessage<T = any, U = T> {
    /**
     * Cache's path
     */
    path: string;
    /**
     * Cache's old value
     */
    old: T;
    /**
     * Cache's new value
     */
    new: U;
}

export const CacheShareTag = 'MEMORY_CACHE_SHARE';

export class MemoryCache {
    private static store = new SerializableNode('MemoryCache', undefined);
    private static injectors: ((key: string, value: any) => any)[] = [];
    private static _config: IMemoryCacheConfig = { action: {
        mask: 1, tag: 'ACTION', restoreTag: 'MEMORY_CACHE_RESTORE'
    } };

    public static initialize(): void {
        MessageQueue.listener
            .hasPriority(Number.MAX_SAFE_INTEGER)
            .for(this._config.action.mask)
            .listen(CacheShareTag)
            .receiver(message => {
                if (!message.isFromCrossShare) { return message; }
                const data: IMemoryCacheMessage = message.value;
                this.set(data.path, data.new, true, false);
                return message;
            }).register();
    }

    /**
     * Get configuration
     */
    public static get config(): IMemoryCacheConfig {
        return this._config;
    }

    /**
     * Register injector
     * @param injector Target injector. Injector will be called before store any value, the returned value will be used
     * as real value to store.
     */
    public static inject(injector: (key: string, value: any) => any): void {
        if (!this.injectors.includes(injector)) {
            this.injectors.push(injector);
        }
    }

    /**
     * Get cached item
     * @param path Cached item's key
     */
    public static get<T = any>(path: string): T | undefined {
        return this.store.find(path).value;
    }

    /**
     * Indicate if cached item is not undefined
     * @param key Cached item's key
     */
    public static has(path: string): boolean {
        return this.store.find(path).value !== undefined;
    }

    /**
     * Set cached item's value or create new cache item. If delete the item, please set its value to ```undefined```.
     * @param key Item key
     * @param value New value
     * @param ignoreInjector Should ignore all injectors when store this value
     * @param share Should push to application's other instance if ```MessageService```'s cross share is enabled
     */
    public static set<T>(path: string, value: T, ignoreInjector?: boolean, share?: boolean): void {
        const node = this.store.find(path);
        const oldValue = node.value;
        if (!ignoreInjector) {
            this.injectors.forEach(injector => value = injector(path, value));
        }
        node.value = value;
        MessageQueue.asyncMessage
            .useIdentifier(this._config.action.mask, this._config.action.tag)
            .useValue<IMemoryCacheMessage>({ path: path, old: oldValue, new: value })
            .send();
        if (share) {
            MessageQueue.asyncMessage
                .useIdentifier(this._config.action.mask, CacheShareTag)
                .useValue<IMemoryCacheMessage>({ path: path, old: oldValue, new: value })
                .send();
        }
    }

    /**
     * Dump storage
     */
    public static dump(from?: string): ISerializableNode {
        return this.store.find(from || '/').serialize();
    }

    /**
     * Restore from serialized data
     * @param data Target data
     */
    public static restore(data: ISerializableNode): void {
        this.store = SerializableNode.deserialize(data);
        MessageQueue.asyncMessage
            .useIdentifier(this._config.action.mask, this._config.action.restoreTag)
            .useValue<SerializableNode>(this.store)
            .enableShare()
            .send();
    }

    private constructor() { }
}

MemoryCache.initialize();
