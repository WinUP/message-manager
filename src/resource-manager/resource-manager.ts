import { AsynchronizedMessage } from '../message';
import { InjectorTimepoint } from './injector-timepoint';
import { ResourceProtocol } from './resource-protocol';
import { ResourceResponse } from './resource-response';
import { ResourceRequest } from './resource-request';
import { ResponseStatus } from './response-status';
import { RequestMode } from './request-mode';

/**
 * Configurations for ResourceManager
 */
export interface IResourceManagerConfig {
    /**
     * Response message configuration
     */
    response: {
        /**
         * Message mask (default 1)
         */
        mask: number;
        /**
         * Message tag (default 'RESPONSE')
         */
        tag: string;
    };
}

/**
 * Request injector
 */
export type RequestInjector = (request: ResourceRequest, response: ResourceResponse<any>, timepoint: InjectorTimepoint)
    => void | ResourceResponse<any> | Promise<ResourceResponse<any>> | Promise<void>;

/**
 * Resource manager service
 */
export namespace ResourceManager {
    /**
     * Message configuration
     */
    export const config: IResourceManagerConfig = { response: { mask: 1, tag: 'RESPONSE' } };

    const protocols: Map<string, ResourceProtocol> = new Map();
    const injectors: Map<number, RequestInjector[]> = new Map();

    /**
     * Send request
     * @param request Resource request
     * @param mode Request mode
     */
    export function send<T>(request: ResourceRequest, mode?: RequestMode.ViaMessageService): void;
    export function send<T>(request: ResourceRequest, mode: RequestMode.Asynchronized): Promise<ResourceResponse<T>>;
    export function send<T>(request: ResourceRequest, mode: RequestMode.Synchronized): ResourceResponse<T>;
    export function send<T>(request: ResourceRequest, mode: RequestMode = RequestMode.ViaMessageService): void | ResourceResponse<T> | Promise<ResourceResponse<T>> {
        if (!request.provider) {
            throw new TypeError('Cannot send request: Should set provider/protocol/address first');
        }
        let response: ResourceResponse<T> | Promise<ResourceResponse<T>> = new ResourceResponse<T>(request);
        response = callInjectors(request, response, InjectorTimepoint.BeforeSend);
        if (mode === RequestMode.Synchronized) {
            checkSynchronizedType(response);
        }
        if (response instanceof Promise) {
            response = response.then(r => r.useStatus(ResponseStatus.Sending));
        } else {
            response.useStatus(ResponseStatus.Sending);
        }
        if (mode === RequestMode.Synchronized) {
            if (!checkSynchronizedType(response)) return;
            try {
                const data = request.provider.requestSync(request);
                response.responseData = data;
                response.useStatus(ResponseStatus.Succeed);
                response = callInjectors(request, response, InjectorTimepoint.OnSucceed) ?? response;
            } catch (e) {
                if (!checkSynchronizedType(response)) return;
                response.responseData = e;
                response.useStatus(ResponseStatus.Failed);
                response = callInjectors(request, response, InjectorTimepoint.OnFailed);
            }
            if (!checkSynchronizedType(response)) return;
            return response;
        } else {
            const promise = request.provider.request(request).then(async data => {
                response = response instanceof Promise ? await response : response;
                response.responseData = data;
                response.useStatus(ResponseStatus.Succeed);
                return callInjectors(request, response, InjectorTimepoint.OnSucceed);
            }).catch(async error => {
                response = response instanceof Promise ? await response : response;
                response.responseData = error;
                response.useStatus(ResponseStatus.Failed);
                return callInjectors(request, response, InjectorTimepoint.OnFailed);
            });
            if (mode === RequestMode.Asynchronized) {
                return promise;
            } else {
                promise.then(e => {
                    response = e;
                    AsynchronizedMessage
                        .from(response)
                        .useIdentifier(config.response.mask, config.response.tag)
                        .send();
                });
            }
        }
    }

    /**
     * Register resource protocol
     * @param protocol Protocol provider
     */
    export function useProtocol(protocol: ResourceProtocol): void {
        protocol.protocols.forEach(e => protocols.set(e, protocol));
    }

    /**
     * Find resource protocol provider
     * @param protocol Protocol's name
     */
    export function findProtocol(protocol: string): ResourceProtocol | undefined {
        return protocols.get(protocol);
    }

    /**
     * Remove resource protocol provider
     * @param protocol Protocol's name
     */
    export function dropProtocol(protocol: string): ResourceProtocol | undefined {
        const item = protocols.get(protocol);
        if (item == null) {
            return undefined;
        } else {
            protocols.delete(protocol);
            return item;
        }
    }

    /**
     * Remove all protocols
     */
    export function dropAllProtocols(): ResourceProtocol[] {
        const result = Array.from(protocols.values());
        protocols.clear();
        return result;
    }

    /**
     * Register an injector
     * @param injector Injector
     * @param timepoint Timepoints to raise this injector (using bit compare), or not given for
     * add to all timepoints.
     */
    export function useInjector(injector: RequestInjector, timepoint?: number): void {
        if (timepoint == null || (timepoint & InjectorTimepoint.BeforeSend) !== 0) {
            addInjector(InjectorTimepoint.BeforeSend, injector);
        }
        if (timepoint == null || (timepoint & InjectorTimepoint.OnFailed) !== 0) {
            addInjector(InjectorTimepoint.OnFailed, injector);
        }
        if (timepoint == null || (timepoint & InjectorTimepoint.OnSucceed) !== 0) {
            addInjector(InjectorTimepoint.OnSucceed, injector);
        }
    }

    /**
     * Remove an injector
     * @param injector Injector
     * @param timepoint Timepoints that should remove the injector from (using bit compare), or not given for
     * search all timepoints.
     */
    export function dropInjector(injector: RequestInjector, timepoint?: number): void {
        (timepoint == null || ((timepoint & InjectorTimepoint.BeforeSend) !== 0)) && removeInjector(InjectorTimepoint.BeforeSend, injector);
        (timepoint == null || ((timepoint & InjectorTimepoint.OnFailed) !== 0)) && removeInjector(InjectorTimepoint.OnFailed, injector);
        (timepoint == null || ((timepoint & InjectorTimepoint.OnSucceed) !== 0)) && removeInjector(InjectorTimepoint.OnSucceed, injector);
    }

    /**
     * Remove all injectors
     */
    export function dropAllInjectors(): void {
        injectors.has(InjectorTimepoint.BeforeSend) && injectors.delete(InjectorTimepoint.BeforeSend);
        injectors.has(InjectorTimepoint.OnFailed) && injectors.delete(InjectorTimepoint.OnFailed);
        injectors.has(InjectorTimepoint.OnSucceed) && injectors.delete(InjectorTimepoint.OnSucceed);
    }

    function addInjector(timepoint: InjectorTimepoint, injector: RequestInjector): void {
        const collection = injectors.get(timepoint) ?? [];
        collection.indexOf(injector) < 0 && collection.push(injector);
        injectors.set(timepoint, collection);
    }

    function removeInjector(timepoint: InjectorTimepoint, injector: RequestInjector): void {
        const collection = injectors.get(timepoint);
        if (collection == null) return;
        const index = collection.indexOf(injector);
        if (index > -1) {
            collection.splice(index, 1);
        }
    }

    /**
     * Call injectors
     * @param request Request
     * @param response Response
     * @param timepoint Timepoint
     */
    function callInjectors(request: ResourceRequest, response: ResourceResponse<any>, timepoint: InjectorTimepoint): ResourceResponse<any> | Promise<ResourceResponse<any>> {
        const collection = injectors.get(timepoint);
        if (collection == null) return response;
        let result: ResourceResponse<any> | Promise<ResourceResponse<any>> = response;
        for (let i = -1, length = collection.length; ++i < length;) {
            if (result instanceof Promise) {
                result = result.then(e => collection[i].call(e, request, e, timepoint) ?? e);
            } else {
                const data: void | ResourceResponse<any> | Promise<ResourceResponse<any>> | Promise<void> = collection[i].call(result, request, result, timepoint);
                if (data instanceof Promise) {
                    result = Promise.resolve(result).then(async r => (await data as any) ?? r);
                } else {
                    result = (data as any) ?? result;
                }
            }
        }
        return result;
    }

    function checkSynchronizedType(response: ResourceResponse<any> | Promise<ResourceResponse<any>>): response is ResourceResponse<any> {
        if (response instanceof Promise) {
            throw new TypeError('Cannot send request: Promise detected in synchronized mode');
        }
        return true;
    }
}
