import { v4 } from 'uuid';

import type { AdvancedTree } from '../utils';
import type { Message } from './messages';
import { MessageQueue } from './message-queue';
import { callStack } from '../utils';

export type ListenerReceiver = (message: Message) => Promise<Message> | Promise<void> | void | Message;

/**
 * Message listener
 */
export class Listener {
    /**
     * Create a new persistent listener for given mask ans tags
     * @param mask Listener's mask
     * @param tags Listener's tags
     */
    public static on(mask: number, ...tags: string[]): Listener {
        return new Listener().useMask(mask).useTag(...tags).asPersistence();
    }

    /**
     * Create a new temporary listener for given mask ans tags
     * @param mask Listener's mask
     * @param tags Listener's tags
     */
    public static once(mask: number, ...tags: string[]): Listener {
        return new Listener().useMask(mask).useTag(...tags).asOnce();
    }

    /**
     * Get listener's ID
     */
    public get id(): string {
        return this._id;
    }

    /**
     * Listener's mask
     * @default 0
     */
    public get mask(): number {
        return this._mask;
    } public set mask(value: number) {
        this.useMask(value);
    }

    /**
     * Indicate if listener can only run once
     * @default false
     */
    public get onlyOnce(): boolean {
        return this._onlyOnce;
    } public set onlyOnce(value: boolean) {
        value ? this.asOnce() : this.asPersistence();
    }

    /**
     * Listener node's priority
     * @default 0
     */
    public get priority(): number {
        return this._priority;
    } public set priority(value: number) {
        this.usePriority(value);
    }

    /**
     * Listener's tags
     */
    public get tags(): ReadonlySet<string> {
        return this._tags;
    }

    /**
     * Enabled of listener node
     */
    public get enabled(): boolean {
        return this._enabled;
    } public set enabled(value: boolean) {
        this._enabled = value;
        this._node && (this._node.enabled = value);
    }

    private _id: string;
    private _tags: Set<string> = new Set();
    private _mask: number = 0;
    private _priority: number = 0;
    private _onlyOnce: boolean = false;
    private _receiver: ListenerReceiver | undefined;
    private _node: AdvancedTree<this> | undefined;
    private _enabled: boolean = true;

    /**
     * Create a new listener
     * @param id Listener's ID, or nothing to use callstack information to generate ID
     * @param attachUniqueId Should attach another unique ID at the end of given ID
     */
    public constructor(id?: string, attachUniqueId: boolean = true) {
        if (id) {
            this._id = id;
        } else {
            const stack = callStack();
            const name = stack && stack.length > 1 ? stack[2].identifiers[0] : '';
            this._id = name;
        }
        if (attachUniqueId) {
            this._id = `${this._id}[${v4()}]`
        }
    }

    /**
     * Set listener's mask
     * @param mask Mask
     */
    public useMask(mask: number): this {
        this._mask = mask;
        return this;
    }

    /**
     * Listen target tag
     * @param tag Message tag
     */
    public useTag(...tag: string[]): this {
        tag.forEach(e => this._tags.add(e));
        return this;
    }

    /**
     * Listener all tags under final mask
     */
    public useAllTags(): this {
        this._tags.clear();
        return this;
    }

    /**
     * Set listener's priority
     * @param priority Priority
     */
    public usePriority(priority: number): this {
        this._priority = priority;
        this._node && (this._node.priority = priority);
        return this;
    }

    /**
     * Indicate if listener can listen target message type
     * @param mask Message mask
     * @param tag Message tag
     */
    public canParse(mask: number, tag?: string): boolean {
        return (this._mask & mask) !== 0 && (this._tags.size === 0 || !tag || this._tags.has(tag));
    }

    /**
     * Only run listener once then destroy itself
     */
    public asOnce(): this {
        this._onlyOnce = true;
        return this;
    }

    /**
     * Always run listener until got destroyed
     */
    public asPersistence(): this {
        this._onlyOnce = false;
        return this;
    }

    /**
     * Set listener's receiver function
     * @param target Receiver function
     */
    public useReceiver(target: ListenerReceiver): this {
        this._receiver = target;
        return this;
    }

    /**
     * Parse a message
     * @param message Target message
     */
    public parse(message: Message): Message | Promise<Message> {
        if (this._receiver == null) return message;
        const result = this._receiver.call(this, message);
        if (result == null) {
            return message;
        } else if (result instanceof Promise) {
            return (result as Promise<Message | undefined>).then((data?: Message): Message => data == null ? message : data);
        } else {
            return result;
        }
    }

    /**
     * Register this listener to message service
     * @param parent Parent listener on message service if have
     */
    public register(parent?: Listener | AdvancedTree<Listener>): AdvancedTree<Listener> {
        return MessageQueue.receive(this, parent instanceof Listener ? parent : parent?.content, this._priority);
    }

    /**
     * Destroy this listener if registered, otherwise do nothing.
     */
    public destroy(): void {
        this._node?.destroy();
        this._node = undefined;
    }
}
