import { Configuration } from '../Configuration';
import { BaseComponent } from './BaseComponent';
import { AutoRegister } from './AutoRegister';

/**
 * State listener parameters
 */
export interface StateListenerDefinition {
    /**
     * From state
     */
    from: string | RegExp;
    /**
     * To state
     */
    to: string | RegExp;
}

/**
 * State listener
 * @param input Parameters
 */
export function StateListener(input: StateListenerDefinition) {
    return function (target: BaseComponent, propertyKey: string, descriptor: PropertyDescriptor) {
        Object.defineProperty(target, `${propertyKey}${Configuration.base.reflectorName}`, {
            get: (): AutoRegister => ({
                type: 'StateListener',
                params: [input.from, input.to]
            })
        });
    };
}
