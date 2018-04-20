import { ResourceResponse, ResourceRequest } from '../structures';
import { InjectorTimepoint } from './InjectorTimepoint';

/**
 * Request injector
 */
export type RequestInjector = (request: ResourceRequest, response: ResourceResponse<any>,
    responseData: any, timepoint: InjectorTimepoint) => any;
