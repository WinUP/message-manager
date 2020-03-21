import type { ResourceResponse } from '../resource-manager';
import type { ValueIndicator } from './define-registers';
import { defineRegisters, AutoRegisterType } from './define-registers';

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
 * @description Must not use on static function
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
