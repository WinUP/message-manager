import { AdvancedTree } from '../utils';
import { Listener } from './listener';
import { Message } from './messages';

/**
 * Message queue
 */
export namespace MessageQueue {
    /**
     * Get or set status of debug mode
     * @description Instant debugger name: messageStructureGraph, will print listener tree
     */
    export let debugMode: boolean = false;

    const root: AdvancedTree<Listener> = new AdvancedTree<Listener>(undefined, 'MessageRoot');

    /**
     * Print listener structure
     */
    export function printStructure(): void {
        root.print();
    }

    /**
     * Broadcast a message
     * @param message Message
     */
    export function send(message: Message): Message | Promise<Message> {
        debugMode && printDebugInformation(message);
        const deleteQueue: AdvancedTree<Listener>[] = [];
        if (message.isSynchronized) {
            const syncResult = root.reduce<Message>((node, result) => {
                const listener = node.content;
                if (!listener?.canParse(message.mask, message.tag)) return result;
                const parseData = listener.parse(result);
                if (parseData instanceof Promise) {
                    throw new TypeError(`Cannot run listener ${listener.id}: Synchronized message cannot have PromiseLike result`);
                }
                listener.onlyOnce && deleteQueue.push(node);
                return parseData;
            }, message);
            deleteQueue.forEach(node => node.destroy());
            return syncResult;
        } else {
            const chain = (async () => message)();
            root.reduce(async (node, result) => {
                const listener = node.content;
                if (!listener?.canParse(message.mask, message.tag)) return result;
                try {
                    const parseData = listener.parse(await result);
                    listener.onlyOnce && deleteQueue.push(node);
                    return parseData;
                } catch (e) {
                    console.error(`Cannnot run listener ${listener.id} in node ${node.id}`);
                    console.error(e);
                }
                return message;
            }, chain);
            deleteQueue.forEach(node => node.destroy());
            return chain;
        }
    }

    /**
     * Register a listener
     * @param handler Listener
     * @param parent Listener's parent
     * @param priority Listener's priority
     */
    export function receive(listener: Listener, parent?: Listener, priority: number = 0): AdvancedTree<Listener> {
        if ((listener as any)._node != null) return (listener as any)._node;
        const parentNode = parent ? root.find(node => node.content === parent) : root;
        if (!parentNode) {
            throw new TypeError(`Cannot register listener ${listener.id}: Cannot find wanted parent`);
        }
        const targetNode = new AdvancedTree<Listener>(listener, listener.id);
        targetNode.priority = priority;
        targetNode.parent = parentNode;
        targetNode.enabled = listener.enabled;
        (listener as any)._node = targetNode;
        return targetNode;
    }

    /**
     * Destroy all listeners that registered to message queue
     */
    export function destroyAllListeners(): void {
        if (root.children.length < 1) return;
        while (root.children.length > 0) {
            root.children[0].destroy();
        }
    }

    function printDebugInformation(message: Message): void {
        console.groupCollapsed(
            `🎈 ${message.id} ` +
            `%c<${message.mask}>%c %c${message.tag}%c ` +
            `%c[${message.isSynchronized ? 'A' : 'S'}]%c` +
            `${message.value != null && message.value instanceof Object ? '' : `-> ${message.value}`}`,
            'color:#9C27B0', 'color:inherit',
            'color:#D50000', 'color:inherit',
            message.isSynchronized ? 'color:#4CAF50' : 'color:#FF9800', 'color:inherit');
        if (message.value != null && message.value instanceof Object) {
            console.log(message.value);
        }
        console.trace('Stack trace');
        console.groupEnd();
    }
}
