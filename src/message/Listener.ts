import { createUUIDString, callStack, AdvancedTree } from '@dlcs/tools';
import { Observable } from 'rxjs/Observable';
import { includes } from 'lodash';

import { MessageService } from './message.service';
import { Message } from './Message';

/**
 * Message listener
 */
export class Listener {
    private _tag: string[] = [];
    private _mask: number = 0;
    private _priority: number = 0;
    private _disposable: boolean = false;
    private _receiver: ((message: Message) => Message | Observable<Message> | Promise<Message>) | null = null;

    private constructor(private _id: string, private _service: MessageService) { }

    /**
     * Create a new listener from target message service
     * @param service Message service
     * @description Listener default settings: mask 0, undisposable, listene all
     */
    public static from(service: MessageService): Listener {
        const stack = callStack();
        const target = new Listener(`[${stack[2].identifiers[0]}]${createUUIDString()}`, service);
        return target;
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
        if (!includes(this._tag, tag)) {
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
    public isAvailableFor(mask: number, tag: string | null): boolean {
        return (this._mask & mask) !== 0 && (this._tag.length === 0 || !tag || includes(this._tag, tag));
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
        if (this._service == null) {
            throw new TypeError(`Cannot register message listener ${this._id}: No available message service`);
        }
        return this._service.receive(this, parent, this._priority);
    }
}
