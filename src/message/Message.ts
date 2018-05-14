import { uuid } from '@dlcs/tools';

import { IMessageMetadata } from './MessageMetadata';
import { MessageQueue } from './message-queue';

/**
 * Message
 */
export abstract class Message {
    protected _fromCrossShare: boolean = false;
    protected _ignoreCrossShare: boolean = false;
    protected _synchronized: boolean = false;
    protected _lazyShare: boolean = false;
    protected _value: any;
    protected _mask: number = 0;
    protected _tag: string = '';
    protected _id: string;

    /**
     * Create a new message from target message service
     * @param synchronized Is synchronized message
     * @param crossShare Is cross share message
     * @param service Message service
     * @param id ID
     * @description Message default settings: mask 0, no tag, asynchronized
     */
    protected constructor(synchronized: boolean, crossShare: boolean, id?: string) {
        this._synchronized = synchronized;
        this._fromCrossShare = crossShare;
        this._id = id || uuid();
    }

    /**
     * Get message's ID
     */
    public get id(): string {
        return this._id;
    }

    /**
     * Get message's tag
     * @default ''
     */
    public get tag(): string {
        return this._tag;
    }

    /**
     * Get message's mask
     * @default 0
     */
    public get mask(): number {
        return this._mask;
    }

    /**
     * Indicate if this message is asynchronized
     */
    public get asynchronized(): boolean {
        return !this._synchronized;
    }

    /**
     * Indicate if this message is synchronized
     */
    public get isCrossShare(): boolean {
        return this._fromCrossShare;
    }

    /**
     * Indicate if lazy share is enabled
     * @default false
     */
    public get isLazyShare(): boolean {
        return this._fromCrossShare;
    }

    /**
     * Indicate if cross share for this message is disabled
     */
    public get isIgnoreCrossShare(): boolean {
        return this._ignoreCrossShare;
    }

    /**
     * Get message's metadata
     */
    public get metadata(): IMessageMetadata {
        return {
            id: this._id,
            sync: this._synchronized,
            lazy: this._lazyShare,
            mask: this._mask,
            tag: this._tag,
            value: this._value,
            ignore: this._ignoreCrossShare
        };
    }

    /**
     * Get message's content
     */
    public get value(): any {
        return this._value;
    }

    /**
     * Enable lazy share
     * @description Lazy share only affects cross share. Normally message will send its copy immediately to
     * cross share, when lazy share is enabling, it will send after all suitable listener processed itself.
     */
    public lazy(): this {
        this._lazyShare = true;
        return this;
    }

    /**
     * Disable cross share for this message, no matter what message service's configuration is.
     */
    public noShare(): this {
        this._ignoreCrossShare = true;
        return this;
    }

    /**
     * Set message's mask and tag
     * @param mask Mask
     * @param tag Tag
     */
    public mark(mask: number, tag: string): this {
        this._mask = mask;
        this._tag = tag;
        return this;
    }

    /**
     * Set message's content
     * @param value Content
     */
    public use<T>(value: T): this {
        this._value = value;
        return this;
    }
}

/**
 * Synchronized message
 */
export class SynchronizedMessage extends Message {
    public constructor(id?: string) {
        super(true, false, id);
    }

    /**
     * Copy this message as asynchronized message
     */
    public toAsynchronized(): AsynchronizedMessage {
        return new AsynchronizedMessage(this._id)
            .mark(this._mask, this._tag)
            .use(this._value);
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
    public constructor(id?: string) {
        super(false, false, id);
    }

    /**
     * Copy this message as synchronized message
     */
    public toSynchronized(): SynchronizedMessage {
        return new SynchronizedMessage(this._id)
            .mark(this._mask, this._tag)
            .use(this._value);
    }

    /**
     * Send this message to message service
     */
    public send(): Promise<AsynchronizedMessage> {
        return MessageQueue.send(this) as Promise<AsynchronizedMessage>;
    }
}

/**
 * Shared message
 */
export class SharedMessage extends Message {
    public constructor(id?: string) {
        super(false, true, id);
    }

    /**
     * Send this message to message service
     */
    public send(): Promise<AsynchronizedMessage> {
        return MessageQueue.send(this) as Promise<AsynchronizedMessage>;
    }
}
