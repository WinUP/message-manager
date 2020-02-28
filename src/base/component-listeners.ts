import { IAutoRegister, getRegisters, AutoRegisterType, ValueIndicator } from './define-registers';
import { ResourceResponse, ResourceManager } from '../resource-manager';
import { IMemoryCacheMessage, MemoryCache } from '../memory-cache';
import { AdvancedTree } from '../utils';
import { Listener } from '../message';

/**
 * Manage components and their root listeners
 */
export namespace ComponentListeners {
    const components: Map<Object, AdvancedTree<Listener>> = new Map();

    /**
     * Set a new node with given target and priority.
     *
     * - If target already has node, that node will be destroyed
     * - Remember to destroy the node when target is not using anymore by calling `destroy` function
     * @param target Target component
     * @param priority Node listener's priority
     */
    export function set(target: Object, priority: number = 100): void {
        destroy(target);
        components.set(target, Listener.on(-1).usePriority(priority).register());
        const registers: IAutoRegister[] = findRegisters(target.constructor as ClassType<any>);
        for (let i = -1, length = registers.length, item = registers[0]; ++i < length; item = registers[i + 1]) {
            const handler: any = (target as any)[item.target];
            if (item.type === AutoRegisterType.ResourceListener) {
                onResponse(target, handler, item.params[0], item.params[1], item.params[2]);
            } else if (item.type === AutoRegisterType.MessageListener) {
                let listener = Listener.on(item.params[0]);
                if (item.params[1] != null) {
                    listener = listener.usePriority(item.params[1]);
                }
                if (item.params.length > 2) {
                    listener = listener.useTag(...item.params.slice(2));
                } else {
                    listener = listener.useAllTags();
                }
                onMessage(target, listener.useReceiver(handler));
            } else if (item.type === AutoRegisterType.MemoryCacheListener) {
                onMemoryCache(target, handler, item.params[0]);
            }
        }
    }

    /**
     * Indicate if given target has node registered
     * @param target Target component
     */
    export function has(target: Object): boolean {
        return get(target) != null;
    }

    /**
     * Get root node that registered with given target
     * @param target Target component
     */
    export function get(target: Object): AdvancedTree<Listener> | undefined {
        return components.get(target);
    }

    /**
     * Disable all nodes registered with given target
     * @param target Target component
     */
    export function disable(target: Object): void {
        const node = components.get(target);
        if (node == null) return;
        node.enabled = false;
    }

    /**
     * Enable all nodes registered with given target
     * @param target Target component
     */
    export function enable(target: Object): void {
        const node = components.get(target);
        if (node == null) return;
        node.enabled = true;
    }

    /**
     * Destroy all nodes registered with given target
     * @param target Target component
     */
    export function destroy(target: Object): void {
        const node = components.get(target);
        if (node == null) return;
        node.destroy();
    }

    /**
     * Add message listener
     * @param target Target component
     * @param listener Target listener
     */
    export function onMessage(target: Object, listener: Listener | AdvancedTree<Listener>): void {
        const node = get(target);
        if (node == null) return;
        if (listener instanceof Listener) {
            listener.register(node);
        } else {
            listener.parent = node;
        }
    }

    /**
     * Add resource listener (can only get resources send via message service)
     * @param target Target component
     * @param handler Handler
     * @param address Resource address with protocol
     * @param tags Resource tag
     * @param params Parameters as filter (All should be in one resource's param list to target it)
     */
    export function onResponse<U = any>(target: Object, handler: (data: ResourceResponse<U>) => void, address?: ValueIndicator<string>,
        tags?: ValueIndicator<string>[], params?: { [key: string]: any }): void {
        onMessage(target, Listener.on(ResourceManager.config.response.mask, ResourceManager.config.response.tag)
            .useReceiver(message => {
                const response: ResourceResponse<any> = message.value;
                const resourceAddress = `${response.request.protocol}://${response.request.address}`;
                if (address && ((typeof address === 'string' && address !== resourceAddress)
                    || (typeof address === 'function' && address.call(target, resourceAddress) !== true))) {
                    return message;
                }
                if (tags && tags.every(tag => (typeof tag === 'string' && !response.request.tags.includes(tag))
                    || (typeof tag === 'function' && response.request.tags.every(e => tag.call(target, e) !== true)))) {
                    return message;
                }
                if (params && Object.keys(params).some(key => response.request.params[key] !== params[key])) {
                    return message;
                }
                handler.call(target, response);
                return message;
            })
        );
    }

    /**
     * Add after memory cache changed listener
     * @param target Target component
     * @param handler Handler
     * @param path Cache's path
     */
    export function onMemoryCache(target: Object, handler: (data: IMemoryCacheMessage) => void, path?: string | ((path: string) => boolean)): void {
        onMessage(target, Listener
            .on(MemoryCache.config.mask, MemoryCache.config.tags.onSet)
            .useReceiver(message => {
                const data: IMemoryCacheMessage = message.value;
                if ((typeof path === 'string' && path === data.path) || (typeof path === 'function' && path.call(target, data.path))) {
                    handler.call(target, data);
                }
                return message;
            }));
    }

    function findRegisters(consructor: ClassType<any>): IAutoRegister[] {
        let props: IAutoRegister[] = [];
        Reflect.forEachPrototype(consructor, item => {
            props = props.concat(getRegisters(item) || []);
        });
        return props;
    }
}
