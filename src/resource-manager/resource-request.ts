import { AsynchronizedMessage } from '../message';
import { ResourceProtocol } from './resource-protocol';
import { ResourceResponse } from './resource-response';
import { ResourceManager } from './resource-manager';
import { RequestMode } from './request-mode';
import { RequestType } from './request-type';

/**
 * Resource request
 */
export class ResourceRequest {
    /**
     * Create new request for given URI
     * @param uri URI
     */
    public static to(uri: string): ResourceRequest {
        return new ResourceRequest().to(uri);
    }
    /**
     * Get request's address
     */
    public get address(): string {
        return this._address;
    }

    /**
     * Get request's protocol
     */
    public get protocol(): string {
        return this._protocol;
    }

    /**
     * Get request's protocol provider
     */
    public get provider(): ResourceProtocol | undefined {
        return this._provider;
    }

    /**
     * Get request's content
     */
    public get content(): any {
        return this._content;
    }

    /**
     * Get request's type
     */
    public get type(): RequestType {
        return this._type;
    }

    /**
     * Get request's params
     */
    public get params(): Readonly<{ [key: string]: any }> {
        return this._params;
    }

    /**
     * Get request's tags
     */
    public get tags(): Readonly<string[]> {
        return this._tags;
    }

    private _protocol: string = '';
    private _provider: ResourceProtocol | undefined = undefined;
    private _address: string = '';
    private _content: any;
    private _tags: string[] = [];
    private _params: { [key: string]: any } = {};
    private _type: RequestType = RequestType.Request;

    /**
     * Set request's URI
     * @param uri URI
     */
    public to(uri: string): this {
        const spliterIndex = uri.indexOf('://');
        const protocol = uri.substring(0, spliterIndex);
        this._provider = ResourceManager.findProtocol(protocol);
        if (!this._provider) {
            throw new TypeError(`Cannot set protocol to ${protocol}: No provider for protocol ${protocol}`);
        }
        this._protocol = protocol;
        this._address = uri.substring(spliterIndex + 3);
        return this;
    }

    /**
     * Set request's type
     * @param type Request type
     */
    public useType(type: RequestType): this {
        this._type = type;
        return this;
    }

    /**
     * Set submit content
     * @param content Submit content
     */
    public useContent<T>(content: T): this {
        this._content = content;
        return this;
    }

    /**
     * Add tags
     * @param tags Tags
     */
    public useTag(...tags: string[]): this {
        tags.forEach(tag => !this._tags.includes(tag) && this._tags.push(tag));
        return this;
    }

    /**
     * Add params
     * @param params Params
     */
    public addParam(params: { [key: string]: any }): this {
        Object.keys(params).forEach(v => {
            this._params[v] = params[v];
        });
        return this;
    }

    /**
     * Send request to message service
     */
    public send(): Promise<AsynchronizedMessage> {
        return ResourceManager.send(this, RequestMode.ViaMessageService);
    }

    /**
     * Send request asynchronized
     */
    public require<T>(): Promise<ResourceResponse<T>> {
        return ResourceManager.send<T>(this, RequestMode.Asynchronized);
    }

    /**
     * Send request synchronized (Not all provider supports this method)
     */
    public requireSync<T>(): ResourceResponse<T> {
        return ResourceManager.send<T>(this, RequestMode.Synchronized);
    }
}
