import { Configuration } from '../Configuration';
import { BaseComponent } from './BaseComponent';
import { AutoRegister } from './AutoRegister';

/**
 * Resource listener parameters
 */
export interface ResourceListenerDefinition {
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
export function ResourceListener(input: ResourceListenerDefinition) {
    return function (target: BaseComponent, propertyKey: string, descriptor: PropertyDescriptor) {
        Object.defineProperty(target, `${propertyKey}${Configuration.base.reflectorName}`, {
            get: (): AutoRegister => ({
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
