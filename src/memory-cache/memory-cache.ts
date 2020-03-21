import { ISerializableNode, SerializableNode } from '../utils';
import { AsynchronizedMessage } from '../message';

/**
 * Configurations for MemoryCache
 */
export interface IMemoryCacheConfig {
    /**
     * Message mask (default 1)
     */
    mask: number;
    /**
     * Message tags
     */
    tags: {
        /**
         * Tags on set data (default 'ACTION')
         */
        onSet: string,
        /**
         * Tags on restore storage (default 'RESTORE')
         */
        onRestore: string
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

export namespace MemoryCache {
    /**
     * Message configuration
     */
    export const config: IMemoryCacheConfig = { mask: 1, tags: { onSet: 'ACTION', onRestore: 'RESTORE' } };

    let store = new SerializableNode('MemoryCache', undefined);

    /**
     * Get cached item
     * @param path Cached item's key
     */
    export function get<T = any>(path: string): T | undefined {
        return store.create(path).value;
    }

    /**
     * Indicate if cached item is not undefined
     * @param key Cached item's key
     */
    export function has(path: string): boolean {
        return store.create(path).value !== undefined;
    }

    /**
     * Set cached item's value or create new cache item. If delete the item, please set its value to ```undefined```.
     * @param key Item key
     * @param value New value
     */
    export function set<T>(path: string, value: T): Promise<AsynchronizedMessage> {
        const node = store.create(path);
        const oldValue = node.value;
        node.value = value;
        return AsynchronizedMessage
            .from<IMemoryCacheMessage<any, T>>({ path: path, old: oldValue, new: value })
            .useIdentifier(config.mask, config.tags.onSet)
            .send();
    }

    /**
     * Dump storage
     */
    export function dump(from?: string): ISerializableNode {
        return store.create(from || '/').serialize();
    }

    /**
     * Restore from serialized data
     * @param data Target data
     */
    export function restore(data: ISerializableNode): Promise<AsynchronizedMessage> {
        store = SerializableNode.deserialize(data);
        return AsynchronizedMessage
            .from(store)
            .useIdentifier(config.mask, config.tags.onRestore)
            .send();
    }

    /**
     * Remove all data from cache
     */
    export function clear(): void {
        store.drop('/');
    }
}
