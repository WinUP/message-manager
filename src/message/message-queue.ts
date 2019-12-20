import { AdvancedTree, InstantDebugger, AdvancedTreeNodeStatus } from '@dlcs/tools';
import { Observable } from 'rxjs';

import { Message, SynchronizedMessage, AsynchronizedMessage, SharedMessage } from './Message';
import { IMessageMetadata } from './MessageMetadata';
import { Listener } from './Listener';

/**
 * Message queue
 */
export class MessageQueue {
    private static root: AdvancedTree<Listener> = new AdvancedTree<Listener>(undefined, 'MessageRoot');
    private static worker: SharedWorker.SharedWorker | undefined = undefined;
    private static needSkipId: string[] = [];
    private static _enableShare: boolean = false;
    private static _debugMode: boolean = false;

    /**
     * Broadcast a message
     * @param data Message
     */
    public static send(data: Message): Message | Promise<Message> {
        if (!data.isLazyShare) { this.sendCrossShare(data); }
        if (this._debugMode) {
            console.groupCollapsed(
                `(╯‵□′)╯︵┻━┻ ` +
                `%c${data.id}%c ` +
                `%c<${data.mask}>%c %c${data.tag}%c ` +
                `%c[${data.isSynchronized ? 'ASYNC' : 'SYNC'}]%c %c[${data.isFromCrossShare ? 'CROSS' : 'LOCAL'}]%c ` +
                `${data.value instanceof Object ? '' : '-> ' + data.value}`,
                'color:#9C27B0', 'color:inherit',
                'color:#9C27B0', 'color:inherit',
                'color:#D50000', 'color:inherit',
                data.isSynchronized ? 'color:#4CAF50' : 'color:#FF9800', 'color:inherit',
                data.isFromCrossShare ? 'color:#4CAF50' : 'color:#FF9800', 'color:inherit');
            if (data.value == null) {
                console.log('<Empty message>');
            } else if (data.value instanceof Object) {
                console.log(data.value);
            }
            // tslint:disable-next-line:no-console
            console.trace('Stack trace');
            console.groupEnd();
        }
        const deleteQueue: AdvancedTree<Listener>[] = new Array<AdvancedTree<Listener>>();
        if (data.isSynchronized) {
            const syncResult = this.root.map<Message>((node, result, feedback) => {
                const listener = node.content;
                if (!listener || !listener.isAvailableFor(data.mask, data.tag)) {
                    return result;
                }
                const parseData = listener.parse(result);
                if (parseData instanceof Observable) {
                    throw new TypeError(`Cannot run listener ${listener.id}: Synchronized message cannot have Observable result`);
                }
                if (parseData instanceof Promise) {
                    throw new TypeError(`Cannot run listener ${listener.id}: Synchronized message cannot have PromiseLike result`);
                }
                if (listener.disposable) {
                    deleteQueue.push(node);
                }
                return parseData;
            }, data);
            deleteQueue.forEach(node => node.destroy());
            if (data.isLazyShare) { this.sendCrossShare(data); }
            return syncResult;
        } else {
            const chain = new Promise<Message>((resolve, reject) => resolve(data));
            this.root.map<Promise<Message>>((node, result, feedback) => {
                if (node.status === AdvancedTreeNodeStatus.Unavailable) {
                    return result;
                }
                const listener = node.content;
                if (!listener || !listener.isAvailableFor(data.mask, data.tag)) {
                    return result;
                }
                return result.then(message => {
                    let runResult: Message = message;
                    try {
                        const parseData = listener.parse(message);
                        if (listener.disposable) {
                            deleteQueue.push(node);
                        }
                        if (parseData instanceof Observable) {
                            return parseData.toPromise();
                        }
                        if (parseData instanceof Promise) {
                            return parseData;
                        }
                        runResult = parseData;
                    } catch (e) {
                        console.error(`Cannnot run listener ${listener.id} in node ${node.id}`);
                        console.error(e);
                    }
                    return runResult;
                });
            }, chain);
            deleteQueue.forEach(node => node.destroy());
            return chain.then(message => {
                if (data.isLazyShare) { this.sendCrossShare(data); }
                return message;
            });
        }
    }

    /**
     * Register a listener
     * @param handler Listener
     * @param parent Listener's parent
     * @param priority Listener's priority
     */
    public static receive(listener: Listener, parent?: Listener, priority?: number): AdvancedTree<Listener> {
        let targetNode = this.root.map<AdvancedTree<Listener> | null>((node, result, feedback) => {
            if (node.content === listener) {
                feedback.cancelled = true;
                result = node;
            }
            return null;
        }, null);
        if (targetNode) {
            return targetNode;
        }
        const parentNode = !parent ? this.root : this.root.map<AdvancedTree<Listener> | null>((node, result, feedback) => {
            if (node.content === parent) {
                feedback.cancelled = true;
                result = node;
            }
            return result;
        }, null);
        if (!parentNode) {
            throw new TypeError(`Cannot register listener ${listener.id}: Cannot find wanted parent`);
        }
        targetNode = new AdvancedTree<Listener>(listener, listener.id);
        if (priority != null) {
            targetNode.priority = priority;
        }
        targetNode.parent = parentNode;
        return targetNode;
    }

    /**
     * Get or set status of debug mode
     * @description Instant debugger name: messageStructureGraph, will print listener tree
     */
    public static get debug(): boolean {
        return this._debugMode;
    } public static set debug(value: boolean) {
        if (value) {
            InstantDebugger.register('messageStructureGraph', () => {
                this.root.printStructure();
            });
        } else {
            InstantDebugger.remove('messageStructureGraph');
        }
        this._debugMode = value;
    }

    /**
     * Indicate if cross share is supported
     */
    public static get canCrossShare(): boolean {
        return SharedWorker != null;
    }

    /**
     * Get or set cross share's worker file. Must be set before enable cross share.
     */
    public static crossShareFile: string | (() => string) | undefined = undefined;

    /**
     * Get or set status of cross share mode
     */
    public static get crossShare(): boolean {
        return this._enableShare;
    } public static set crossShare(value: boolean) {
        if (!this.canCrossShare && value) {
            throw new TypeError(`Cannot enable cross share: SharedWorker is not supported by environment`);
        }
        if (!value) {
            if (this.worker) { this.worker.port.close(); }
            this.worker = undefined;
            return;
        }
        if (!this.crossShareFile) {
            throw new TypeError(`Cannot enable cross share: No worker file provided`);
        }
        if (!this.worker) {
            this.worker = new SharedWorker(typeof this.crossShareFile === 'string' ? this.crossShareFile : this.crossShareFile());
            this.worker.port.onmessage = message => {
                const data: IMessageMetadata = message.data;
                if (this.needSkipId.indexOf(data.id) > -1) {
                    this.needSkipId.splice(this.needSkipId.indexOf(data.id), 1);
                    return;
                }
                new SharedMessage(data.id).useIdentifier(data.mask, data.tag).useValue(data.value).send();
            };
            this.worker.port.start();
        }
        this._enableShare = value;
    }

    /**
     * Prepare a synchronized message
     */
    public static get syncMessage(): SynchronizedMessage {
        return new SynchronizedMessage();
    }

    /**
     * Prepare an asynchronize message
     */
    public static get asyncMessage(): AsynchronizedMessage {
        return new AsynchronizedMessage();
    }

    /**
     * Prepare a listener
     */
    public static get listener(): Listener {
        return new Listener();
    }

    private static sendCrossShare(data: Message): void {
        if (this.crossShare && this.worker && !data.isFromCrossShare && !data.isIgnoreCrossShare) {
            const crossData = data.metadata;
            this.needSkipId.push(crossData.id);
            try {
                this.worker.port.postMessage(crossData);
            } catch (ex) {
                if (ex instanceof DOMException && ex.code === DOMException.DATA_CLONE_ERR) {
                    console.warn(`Skip message sync for %c${crossData.id}%c: Clone error`, 'color:#9C27B0', 'color:inherit');
                } else {
                    console.warn(`Skip message sync for %c${crossData.id}%c: ${ex}`, 'color:#9C27B0', 'color:inherit');
                }
            }
        }
    }

    private constructor() { }
}
