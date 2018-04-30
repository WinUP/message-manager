import { SerializableNode } from '@dlcs/tools';

import { BaseComponent } from './BaseComponent';
import { IAutoRegister } from './AutoRegister';

/**
 * State listener parameters
 */
export interface ICacheListenerDefinition {
    /**
     * Cache's key
     */
    key: string | RegExp;
}

/**
 * State listener
 * @param input Parameters
 */
export function CacheListener(input: ICacheListenerDefinition) {
    return function (target: BaseComponent, propertyKey: string, descriptor: PropertyDescriptor) {
        Object.defineProperty(target,
            `${propertyKey}${SerializableNode.get<string>(BaseComponent.config, BaseComponent.configKeys.reflector.name)}`
        , {
            get: (): IAutoRegister => ({
                type: 'CacheListener',
                params: [input.key]
            })
        });
    };
}
