import { mergeMap, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

import { ResourceRequest, ResourceResponse, ResourceProtocol } from './structures';
import { InjectorTimepoint, RequestInjector } from './injector/index';
import { ResponseStatus, IResponseMetadata } from './response/index';
import { MessageQueue } from '../message/message-queue';
import { RequestMode } from './RequestMode';

/**
 * Configurations for ResourceManager
 */
export interface IResourceManagerConfig {
    /**
     * OnResponse and MessageService intergration configuration
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
 * Resource manager service
 */
export class ResourceManager {
    private static protocols: ResourceProtocol[] = [];
    private static injectors: { timepoint: number, injector: RequestInjector }[] = [];
    private static _config: IResourceManagerConfig = { response: { mask: 1, tag: 'RESPONSE' } };

    /**
     * Prepare a request
     */
    public static get request(): ResourceRequest {
        return new ResourceRequest();
    }

    /**
     * Get configuration
     */
    public static get config(): IResourceManagerConfig {
        return this._config;
    }

    private constructor() { }

    /**
     * Send request
     * @param request Resource request
     * @param mode Request mode
     */
    public static apply<T>(request: ResourceRequest, mode: RequestMode): void | ResourceResponse<T | Observable<T>> {
        if (!request.provider) {
            throw new TypeError(`Cannot send request: Should set provider/protocol/address first`);
        }
        const response = new ResourceResponse<T | Observable<T>>(request);
        response.responseData = this.callInjectors(request, response, undefined, InjectorTimepoint.AfterPrepared);
        response.to(ResponseStatus.Sending);
        const injectorCallback = (data: any, timepoint: InjectorTimepoint) => {
            return this.callInjectors(request, response, data, timepoint);
        };
        if (mode === RequestMode.Synchronized) {
            try {
                const data = request.provider.requestSync(request, injectorCallback);
                response.to(ResponseStatus.Succeed);
                response.responseData = this.callInjectors(request, response, data, InjectorTimepoint.OnSucceed);
            } catch (e) {
                response.to(ResponseStatus.Failed);
                response.responseData = this.callInjectors(request, response, e, InjectorTimepoint.OnFailed);
            } finally {
                return response;
            }
        } else {
            response.responseData = request.provider.request(request, injectorCallback).pipe(mergeMap(data => {
                response.to(ResponseStatus.Succeed);
                const result = this.callInjectors(request, response, data, InjectorTimepoint.OnSucceed);
                return result instanceof Observable ? result : of(result);
            }), catchError(error => {
                response.to(ResponseStatus.Failed);
                const result = this.callInjectors(request, response, error, InjectorTimepoint.OnFailed);
                return result instanceof Observable ? result : of(result);
            }));
            if (mode !== RequestMode.ViaMessageService) {
                return response;
            } else {
                response.responseData.subscribe(v => this.sendResponse(response, v), e => this.sendResponse(response, e));
            }
        }
    }

    /**
     * Call injectors
     * @param request Request
     * @param response Response
     * @param timepoint Timepoint
     */
    public static callInjectors(request: ResourceRequest, response: ResourceResponse<any>,
        responseData: any, timepoint: InjectorTimepoint): any {
        let data = responseData;
        this.injectors.filter(v => (v.timepoint & timepoint) !== 0).forEach(v => {
            data = v.injector(request, response, data, timepoint);
        });
        return data;
    }

    /**
     * Register resource protocol
     * @param protocol Protocol provider
     */
    public static registerProtocol(protocol: ResourceProtocol): boolean {
        if (this.protocols.findIndex(v => v === protocol) > -1) {
            return false;
        }
        this.protocols.push(protocol);
        return true;
    }

    /**
     * Find resource protocol provider
     * @param protocol Protocol's name
     */
    public static findProtocol(protocol: string): ResourceProtocol | undefined {
        const provider = this.protocols.find(v => v.isSupport(protocol));
        return provider || undefined;
    }

    /**
     * Register an injector
     * @param timepoint Timepoints to raise this injector (using bit compare)
     * @param injector Injector
     */
    public static inject(timepoint: number, injector: RequestInjector): void {
        const existed = this.injectors.find(v => v.injector === injector);
        if (existed) {
            existed.timepoint = existed.timepoint | timepoint;
        } else {
            this.injectors.push({ timepoint: timepoint, injector: injector });
        }
    }

    private static sendResponse(response: ResourceResponse<any>, responseData: any): void {
        const data = response.metadata;
        data.responseData = responseData;
        MessageQueue.asyncMessage
            .mark(this.config.response.mask, this.config.response.tag)
            .use<IResponseMetadata>(data)
            .send();
    }
}
