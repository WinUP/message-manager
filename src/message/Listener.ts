import { callStack, AdvancedTree, uuid } from '@dlcs/tools';
import { Observable } from 'rxjs';

import { MessageQueue } from './message-queue';
import { Message } from './Message';

/**
 * Message listener
 */
export class Listener {
    private _id: string;
    private _tag: string[] = [];
    private _mask: number = 0;
    private _priority: number = 0;
    private _disposable: boolean = false;
    private _receiver: ((message: Message) => Message | Observable<Message> | Promise<Message>) | null = null;

    /**
     * Create a new listener
     * @param id Listener's ID
     */
    public constructor(id?: string) {
        if (id) {
            this._id = id;
        } else {
            const stack = callStack();
            const name = stack && stack.length > 1 ? stack[2].identifiers[0] : '';
            this._id = `[${name}]${uuid()}`;
        }
    }

    /**
     * Get listener's ID
     */
    public get id(): string {
        return this._id;
    }

    /**
     * Get listener's mask
     * @default 0
     */
    public get mask(): number {
        return this._mask;
    }

    /**
     * Indicate if listener is disposable
     * @default false
     */
    public get disposable(): boolean {
        return this._disposable;
    }

    /**
     * Get listener's priority
     * @default 0
     */
    public get priority(): number {
        return this._priority;
    }

    /**
     * Set listener's mask
     * @param mask Mask
     */
    public for(mask: number): this {
        this._mask = mask;
        return this;
    }

    /**
     * Listen target tag
     * @param tag Message tag
     */
    public listen(tag: string): this {
        if (this._tag.indexOf(tag) < 0) {
            this._tag.push(tag);
        }
        return this;
    }

    /**
     * Listener all tags under final mask
     */
    public listenAll(): this {
        this._tag = [];
        return this;
    }

    /**
     * Set listener's priority
     * @param priority Priority
     */
    public hasPriority(priority: number): this {
        this._priority = priority;
        return this;
    }

    /**
     * Indicate if listener can listen target message type
     * @param mask Message mask
     * @param tag Message tag
     */
    public isAvailableFor(mask: number, tag?: string): boolean {
        return (this._mask & mask) !== 0 && (this._tag.length === 0 || !tag || this._tag.indexOf(tag) > -1);
    }

    /**
     * Set listener as disposable
     */
    public asDisposable(): this {
        this._disposable = true;
        return this;
    }

    /**
     * Set listener as undisposable
     */
    public asUndisposable(): this {
        this._disposable = false;
        return this;
    }

    /**
     * Set listener's receiver function
     * @param target Receiver function
     */
    public receiver(target: (message: Message) => Message | Observable<Message> | Promise<Message>): this {
        this._receiver = target;
        return this;
    }

    /**
     * Parse a message
     * @param message Target message
     */
    public parse(message: Message): Message | Observable<Message> | Promise<Message> {
        return this._receiver ? this._receiver(message) : message;
    }

    /**
     * Register this listener to message service
     * @param parent Parent listener on message service if have
     */
    public register(parent?: Listener): AdvancedTree<Listener> {
        return MessageQueue.receive(this, parent, this._priority);
    }
}
