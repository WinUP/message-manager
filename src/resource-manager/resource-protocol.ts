import { ResourceRequest } from './resource-request';

/**
 * Resouce protocol provider
 */
export abstract class ResourceProtocol {
    /**
     * Get supported protocols
     */
    public get protocols(): ReadonlyArray<string> {
        return this._protocols;
    }

    private _protocols: string[];

    public constructor(...protocols: string[]) {
        this._protocols = protocols;
    }

    /**
     * Request resources
     * @param request Resource request
     */
    public abstract async request(request: ResourceRequest): Promise<any>;

    /**
     * Request resources synchronized, if protocol doesn't support synchronized mode, the method will throw error.
     * @param request Resource request
     */
    public abstract requestSync(request: ResourceRequest): any;
}
