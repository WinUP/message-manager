import { SerializableNode } from '@dlcs/tools';

import { BaseComponent } from './BaseComponent';
import { IAutoRegister } from './AutoRegister';

/**
 * Resource listener parameters
 */
export interface IResourceListenerDefinition {
    /**
     * Resource's address
     */
    address?: string | RegExp;
    /**
     * Resource's tag
     */
    tags?: (string | RegExp)[];
    /**
     * Component state
     */
    state?: string | RegExp;
    /**
     * Extra parameters
     */
    params?: { [key: string]: any };
}

/**
 * Resource listener
 * @param input Parameters
 */
export function ResourceListener(input: IResourceListenerDefinition) {
    return function (target: BaseComponent, propertyKey: string, descriptor: PropertyDescriptor) {
        Object.defineProperty(target,
            `${propertyKey}${SerializableNode.get<string>(BaseComponent.config, BaseComponent.configKeys.reflector.name)}`
        , {
            get: (): IAutoRegister => ({
                type: 'ResourceListener',
                params: [
                    input.address,
                    input.tags,
                    input.state,
                    input.params
                ]
            })
        });
    };
}
