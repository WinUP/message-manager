import type { ResourceRequest } from './resource-request';
import { ResponseStatus } from './response-status';

export class ResourceResponse<T> {
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

    private _request: ResourceRequest;
    private _status: ResponseStatus;

    public constructor(request: ResourceRequest) {
        this._request = request;
        this._status = ResponseStatus.Preparing;
    }

    /**
     * Set response's status
     * @param status Response status
     */
    public useStatus(status: ResponseStatus): this {
        this._status = status;
        return this;
    }
}
