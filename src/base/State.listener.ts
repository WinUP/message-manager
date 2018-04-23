import { SerializableNode } from '@dlcs/tools';

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
        Object.defineProperty(target, `${propertyKey}${SerializableNode.get<string>(BaseComponent.config, '/reflector/name')}`, {
            get: (): AutoRegister => ({
                type: 'StateListener',
                params: [input.from, input.to]
            })
        });
    };
}
