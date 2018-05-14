import { Observable } from 'rxjs';
import { isMatch } from '@dlcs/tools';

import { InjectorTimepoint } from './injector/InjectorTimepoint';
import { IResponseMetadata } from './response/ResponseMetadata';
import { IRequestMetadata } from './request/RequestMetadata';
import { ResourceManager } from './resource-manager';
import { ResponseStatus } from './response/ResponseStatus';
import { RequestType } from './request/RequestType';
import { RequestMode } from './RequestMode';

/**
 * Resouce protocol provider
 */
export abstract class ResourceProtocol {
    private _protocols: string[];

    public constructor(...protocols: string[]) {
        this._protocols = protocols;
    }

    /**
     * Get supported protocols
     */
    public get protocols(): string[] {
        return this._protocols;
    }

    /**
     * Indicate if target protocol is supported
     * @param protocol Protocol
     */
    public isSupport(protocol: string): boolean {
        return this._protocols.findIndex(v => v === protocol) > -1;
    }

    /**
     * Request resources
     * @param request Resource request
     */
    public abstract request(request: ResourceRequest, injector?: (data: any, timepoint: InjectorTimepoint) => any): Observable<any>;

    /**
     * Request resources synchronized (If not support, plese throw error)
     * @param request Resource request
     */
    public abstract requestSync(request: ResourceRequest, injector?: (data: any, timepoint: InjectorTimepoint) => any): any;
}

/**
 * Resource request
 */
export class ResourceRequest {
    private _protocol: string = '';
    private _provider: ResourceProtocol | undefined = undefined;
    private _address: string = '';
    private _content: any;
    private _tags: string[] = [];
    private _params: { [key: string]: any } = {};
    private _type: RequestType = RequestType.Request;

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

    /**
     * Get request's metadata
     */
    public get metadata(): IRequestMetadata {
        return {
            protocol: this.protocol,
            address: this.address,
            tags: this._tags,
            params: this._params,
            content: this._content,
            type: this._type
        };
    }

    /**
     * Indicate if target tag is in target request
     * @param request Resource request
     * @param tag Target tag
     */
    public static hasTag(request: ResourceRequest | IRequestMetadata, tag: string | RegExp): boolean {
        return request.tags.some(v => isMatch(tag, v));
    }

    /**
     * Indicate if target param is in target request
     * @param request Resource request
     * @param name Target param
     */
    public static findParam<T>(request: ResourceRequest | IRequestMetadata, name: string): T | undefined {
        return request.params[name];
    }

    /**
     * Indicate if target tag is in this request
     * @param tag Target tag
     */
    public hasTag(tag: string | RegExp): boolean {
        return ResourceRequest.hasTag(this, tag);
    }

    /**
     * Indicate if target param is in this request
     * @param name Target param
     */
    public findParam<T>(name: string): T | undefined {
        return ResourceRequest.findParam(this, name);
    }

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
    public as(type: RequestType): this {
        this._type = type;
        return this;
    }

    /**
     * Set submit content
     * @param content Submit content
     */
    public submit<T>(content: T): this {
        this._content = content;
        this._type = RequestType.Submit;
        return this;
    }

    /**
     * Add params
     * @param params Params
     */
    public param<T extends { [key: string]: any } = { [key: string]: any }>(params: T): this {
        Object.keys(params).forEach(v => {
            this._params[v] = params[v];
        });
        return this;
    }

    /**
     * Add tags
     * @param tags Tags
     */
    public tag(...tags: string[]): this {
        tags.forEach(tag => !this._tags.includes(tag) && this._tags.push(tag));
        return this;
    }

    /**
     * Send request to message service
     */
    public send(): void {
        ResourceManager.apply(this, RequestMode.ViaMessageService);
    }

    /**
     * Send request asynchronized
     */
    public require<T>(): ResourceResponse<Observable<T>> {
        return ResourceManager.apply<T>(this, RequestMode.Asynchronized) as any;
    }

    /**
     * Send request synchronized (Not all provider supports this method)
     */
    public requireSync<T>(): ResourceResponse<T> {
        return ResourceManager.apply<T>(this, RequestMode.Synchronized) as any;
    }
}

export class ResourceResponse<T> {
    private _request: ResourceRequest;
    private _status: ResponseStatus;

    public constructor(request: ResourceRequest) {
        this._request = request;
        this._status = ResponseStatus.Preparing;
    }

    /**
     * Get or set response's data
     */
    public responseData: T | undefined = undefined;

    /**
     * Get response's status
     */
    public get status(): ResponseStatus {
        return this._status;
    }

    /**
     * Get original request
     */
    public get request(): Readonly<ResourceRequest> {
        return this._request;
    }

    /**
     * Get response's metadata
     */
    public get metadata(): IResponseMetadata {
        return {
            request: this.request.metadata,
            status: this.status,
            responseData: this.responseData
        };
    }

    /**
     * Set response's status
     * @param status Response status
     */
    public to(status: ResponseStatus): this {
        this._status = status;
        return this;
    }
}
