import { SerializableNode, autoname, toPascalCase } from '@dlcs/tools';
import { catchError } from 'rxjs/operators/catchError';
import { Observable } from 'rxjs/Observable';
import { mergeMap } from 'rxjs/operators/mergeMap';
import { of } from 'rxjs/observable/of';

import { ResourceRequest, ResourceResponse, ResourceProtocol } from './structures';
import { InjectorTimepoint, RequestInjector } from './injector/index';
import { ResponseStatus, ResponseMetadata } from './response/index';
import { MessageService } from '../message/message.service';
import { RequestMode } from './RequestMode';

/**
 * Configuration keys for BaseComponent
 */
export interface ResourceManagerConfigKeys {
    /**
     * Response and MessageService intergration configuration
     */
    response: {
        /**
         * Message mask
         * @default 1
         */
        mask: string;
        /**
         * Message tag
         * @default 'RESPONSE'
         */
        tag: string;
    };
}

/**
 * Resource manager service
 */
export class ResourceManager {
    private protocols: ResourceProtocol[] = [];
    private injectors: { timepoint: number, injector: RequestInjector }[] = [];
    private static _config: SerializableNode = SerializableNode.create('ResourceManager', undefined);
    private static _configKeys: ResourceManagerConfigKeys = { response: { mask: '', tag: '' } };

    public static initialize(): void {
        autoname(ResourceManager._configKeys, '/', toPascalCase);
        SerializableNode.set(ResourceManager.config, ResourceManager.configKeys.response.mask, 1);
        SerializableNode.set(ResourceManager.config, ResourceManager.configKeys.response.tag, 'RESPONSE');
    }

    public constructor(private messageService: MessageService) { }

    /**
     * Prepare a request
     */
    public get request(): ResourceRequest {
        return new ResourceRequest(this);
    }

    /**
     * Get configuration
     */
    public static get config(): SerializableNode {
        return ResourceManager._config;
    }

    /**
     * Get configuration keys
     */
    public static get configKeys(): Readonly<ResourceManagerConfigKeys> {
        return ResourceManager._configKeys;
    }

    /**
     * Send request
     * @param request Resource request
     * @param mode Request mode
     */
    public apply<T>(request: ResourceRequest, mode: RequestMode): void | ResourceResponse<T | Observable<T>> {
        if (!request.provider) {
            throw new TypeError(`Cannot send request: Should set provider/protocol/address first`);
        }
        const response = new ResourceResponse<T | Observable<T>>(request);
        response.responseData = this.callInjectors(request, response, null, InjectorTimepoint.AfterPrepared);
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
                response.responseData.subscribe(v => {
                    const data = response.metadata;
                    data.responseData = v;
                    this.messageService.asyncMessage.mark(
                        SerializableNode.get<number>(ResourceManager.config, ResourceManager.configKeys.response.mask),
                        SerializableNode.get<string>(ResourceManager.config, ResourceManager.configKeys.response.tag)
                    ).use<ResponseMetadata>(data).send();
                }, e => {
                    const data = response.metadata;
                    data.responseData = e;
                    this.messageService.asyncMessage.mark(
                        SerializableNode.get<number>(ResourceManager.config, ResourceManager.configKeys.response.mask),
                        SerializableNode.get<string>(ResourceManager.config, ResourceManager.configKeys.response.tag)
                    ).use<ResponseMetadata>(data).send();
                });
            }
        }
    }

    /**
     * Call injectors
     * @param request Request
     * @param response Response
     * @param timepoint Timepoint
     */
    public callInjectors(request: ResourceRequest, response: ResourceResponse<any>,
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
    public registerProtocol(protocol: ResourceProtocol): boolean {
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
    public findProtocol(protocol: string): ResourceProtocol | undefined {
        const provider = this.protocols.find(v => v.isSupport(protocol));
        return provider || undefined;
    }

    /**
     * Register an injector
     * @param timepoint Timepoints to raise this injector (using bit compare)
     * @param injector Injector
     */
    public inject(timepoint: number, injector: RequestInjector): void {
        const existed = this.injectors.find(v => v.injector === injector);
        if (existed) {
            existed.timepoint = existed.timepoint | timepoint;
        } else {
            this.injectors.push({ timepoint: timepoint, injector: injector });
        }
    }
}

ResourceManager.initialize();
