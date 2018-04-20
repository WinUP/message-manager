import { createUUIDString } from '@dlcs/tools';

import { MessageMetadata } from './MessageMetadata';
import { MessageService } from './message.service';

/**
 * Message
 */
export abstract class Message {
    protected _fromCrossShare: boolean = false;
    protected _lazyShare: boolean = false;
    protected _synchronized: boolean = false;
    protected _service: MessageService;
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
    protected constructor(service: MessageService, synchronized: boolean, crossShare: boolean, id?: string) {
        this._synchronized = synchronized;
        this._service = service;
        this._fromCrossShare = crossShare;
        this._id = id || createUUIDString();
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
     * Enable lazy share
     * @description Lazy share only affects cross share. Normally message will send its copy immediately to
     * cross share, when lazy share is enabling, it will send after all suitable listener processed itself.
     */
    public enableLazyShare(): this {
        this._lazyShare = true;
        return this;
    }

    /**
     * Disable lazy share
     * @description Lazy share only affects cross share. Normally message will send its copy immediately to
     * cross share, when lazy share is enabling, it will send after all suitable listener processed itself.
     */
    public disableLazyShare(): this {
        this._lazyShare = false;
        return this;
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
     * Get message's metadata
     */
    public get metadata(): MessageMetadata {
        return {
            id: this._id,
            sync: this._synchronized,
            lazy: this._lazyShare,
            mask: this._mask,
            tag: this._tag,
            value: this._value
        };
    }

    /**
     * Get message's content
     */
    public get value(): any {
        return this._value;
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
    public constructor(service: MessageService, id?: string) {
        super(service, true, false, id);
    }

    /**
     * Copy this message as asynchronized message
     */
    public toAsynchronized(): AsynchronizedMessage {
        return new AsynchronizedMessage(this._service, this._id)
            .mark(this._mask, this._tag)
            .use(this._value);
    }

    /**
     * Send this message to message service
     */
    public send(): SynchronizedMessage {
        return this._service.send(this) as SynchronizedMessage;
    }
}

/**
 * Asynchronized message
 */
export class AsynchronizedMessage extends Message {
    public constructor(service: MessageService, id?: string) {
        super(service, false, false, id);
    }

    /**
     * Copy this message as synchronized message
     */
    public toSynchronized(): SynchronizedMessage {
        return new SynchronizedMessage(this._service, this._id)
            .mark(this._mask, this._tag)
            .use(this._value);
    }

    /**
     * Send this message to message service
     */
    public send(): Promise<AsynchronizedMessage> {
        return this._service.send(this) as Promise<AsynchronizedMessage>;
    }
}

/**
 * Shared message
 */
export class SharedMessage extends Message {
    public constructor(service: MessageService, id?: string) {
        super(service, false, true, id);
    }

    /**
     * Send this message to message service
     */
    public send(): Promise<AsynchronizedMessage> {
        return this._service.send(this) as Promise<AsynchronizedMessage>;
    }
}
