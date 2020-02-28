import { v4 } from 'uuid';

import { MessageQueue } from './message-queue';

/**
 * Message contains unique ID, mask, tag and data that working with message queue
 */
export abstract class Message {
    /**
     * Indicate if this message is asynchronized
     */
    public get isSynchronized(): boolean {
        return this._synchronized;
    }

    /**
     * Get message's unique ID
     */
    public readonly id: string;

    /**
     * Message's mask
     * @default 0
     */
    public mask: number = 0;

    /**
     * Message's tag
     * @default ''
     */
    public tag: string = '';

    /**
     * Message's content
     */
    public value: any;
    protected _synchronized: boolean = false;

    /**
     * Create a new empty message structure
     * @param synchronized Is synchronized message
     * @param id Message's ID
     */
    protected constructor(synchronized: boolean, id?: string) {
        this._synchronized = synchronized;
        this.id = id ?? v4();
    }

    /**
     * Set message's mask and tag
     * @param mask Mask
     * @param tag Tag
     */
    public useIdentifier(mask: number, tag?: string): this {
        this.mask = mask;
        this.tag = tag ?? '';
        return this;
    }

    /**
     * Set message's content
     * @param value Content
     */
    public useValue<T = any>(value: T): this {
        this.value = value;
        return this;
    }
}

/**
 * Synchronized message
 */
export class SynchronizedMessage extends Message {
    /**
     * Create a new empty synchronized message
     */
    public static empty(): SynchronizedMessage {
        return new SynchronizedMessage();
    }

    /**
     * Create a new synchronized message that contains given value
     * @param value Target value
     */
    public static from<T = any>(value: T): SynchronizedMessage {
        return new SynchronizedMessage().useValue(value);
    }

    private constructor() {
        super(true);
    }

    /**
     * Copy this message as asynchronized message
     */
    public toAsynchronized(): AsynchronizedMessage {
        return AsynchronizedMessage
            .empty()
            .useIdentifier(this.mask, this.tag)
            .useValue(this.value);
    }

    /**
     * Send this message to message service
     */
    public send(): SynchronizedMessage {
        return MessageQueue.send(this) as SynchronizedMessage;
    }
}

/**
 * Asynchronized message
 */
export class AsynchronizedMessage extends Message {
    /**
     * Create a new empty asynchronized message
     */
    public static empty(): AsynchronizedMessage {
        return new AsynchronizedMessage();
    }

    /**
     * Create a new asynchronized message that contains given value
     * @param value Target value
     */
    public static from<T = any>(value: T): AsynchronizedMessage {
        return new AsynchronizedMessage().useValue(value);
    }

    private constructor() {
        super(false);
    }

    /**
     * Copy this message as synchronized message
     */
    public toSynchronized(): SynchronizedMessage {
        return SynchronizedMessage
            .empty()
            .useIdentifier(this.mask, this.tag)
            .useValue(this.value);
    }

    /**
     * Send this message to message service
     */
    public async send(): Promise<AsynchronizedMessage> {
        return MessageQueue.send(this) as Promise<AsynchronizedMessage>;
    }
}
