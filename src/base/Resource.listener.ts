import { defineRegisters, AutoRegisterType, ValueIndicator } from './define-registers';
import { ResourceResponse } from '../resource-manager';

/**
 * Resource listener parameters
 */
export interface IResourceListenerDefinition {
    /**
     * Resource's address
     */
    address?: ValueIndicator<string>;
    /**
     * Resource's tag
     */
    tags?: ValueIndicator<string>[];
    /**
     * Extra parameters
     */
    params?: { [key: string]: any };
}

/**
 * Resource listener
 * @param input Parameters
 */
export function ResourceListener<T = any>(input: IResourceListenerDefinition) {
    return function (target: object, propertyKey: string, _descriptor: TypedPropertyDescriptor<(response: ResourceResponse<T>) => void>) {
        defineRegisters(target).push({
            target: propertyKey,
            type: AutoRegisterType.ResourceListener,
            params: [
                input.address,
                input.tags,
                input.params
            ]
        });
    };
}
