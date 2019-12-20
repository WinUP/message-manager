import { v4 } from 'uuid';

import { IMessageMetadata } from './MessageMetadata';
import { MessageQueue } from './message-queue';
import { ShareMode } from './share-mode';

/**
 * Message
 */
export abstract class Message {
    /**
     * Indicate if this message is asynchronized
     */
    public get isSynchronized(): boolean {
        return this._synchronized;
    }

    /**
     * Indicate if this message is synchronized
     */
    public get isFromCrossShare(): boolean {
        return this._fromCrossShare;
    }

    /**
     * Get message's metadata
     */
    public get metadata(): IMessageMetadata {
        return {
            id: this.id,
            sync: this._synchronized,
            mask: this.mask,
            tag: this.tag,
            value: this.value,
            mode: this.shareMode
        };
    }

    /**
     * Get message's unique ID
     */
    public readonly id: string;

    /**
     * Share mode decides the way that message queue share this message to other instances of the application in same environment
     */
    public shareMode: ShareMode = ShareMode.Disabled;

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
    protected _fromCrossShare: boolean = false;
    protected _synchronized: boolean = false;

    /**
     * Create a new message from target message service
     * @param synchronized Is synchronized message
     * @param fromCrossShare Is cross share message
     */
    protected constructor(synchronized: boolean, fromCrossShare: boolean) {
        this._synchronized = synchronized;
        this._fromCrossShare = fromCrossShare;
        this.id = v4();
    }

    /**
     * Turn message's share mode to `ShareMode.Disabled`
     */
    public disableShare(): this {
        this.shareMode = ShareMode.Disabled;
        return this;
    }

    /**
     * Set message's share mode
     * @param mode Destination share mode
     */
    public useShareMode(mode: ShareMode): this {
        this.shareMode = mode;
        return this;
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
    public useValue<T>(value: T): this {
        this.value = value;
        return this;
    }
}

/**
 * Synchronized message
 */
export class SynchronizedMessage extends Message {
    public constructor() {
        super(true, false);
    }

    /**
     * Copy this message as asynchronized message
     */
    public toAsynchronized(): AsynchronizedMessage {
        return new AsynchronizedMessage()
            .useIdentifier(this.mask, this.tag)
            .useShareMode(this.shareMode)
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
    public constructor() {
        super(false, false);
    }

    /**
     * Copy this message as synchronized message
     */
    public toSynchronized(): SynchronizedMessage {
        return new SynchronizedMessage()
            .useIdentifier(this.mask, this.tag)
            .useShareMode(this.shareMode)
            .useValue(this.value);
    }

    /**
     * Send this message to message service
     */
    public async send(): Promise<AsynchronizedMessage> {
        return MessageQueue.send(this) as Promise<AsynchronizedMessage>;
    }
}

/**
 * Shared message
 */
export class SharedMessage extends Message {
    public constructor() {
        super(false, true);
    }

    /**
     * Send this message to message service
     */
    public async send(): Promise<void> {
        await MessageQueue.send(this);
    }
}
