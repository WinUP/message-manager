import { SerializableNode } from '@dlcs/tools';

import { BaseComponent } from './BaseComponent';
import { IAutoRegister } from './AutoRegister';

/**
 * Message listener parameters
 */
export interface IMessageListenerDefinition {
    /**
     * Message mask
     */
    mask: number;
    /**
     * Message tags
     */
    tags?: string[];
    /**
     * Listener priority
     */
    priority?: number;
    /**
     * Component state
     */
    state?: string | RegExp;
}

/**
 * Message listener
 * @param input Parameters
 */
export function MessageListener(input: IMessageListenerDefinition) {
    return function (target: BaseComponent, propertyKey: string, descriptor: PropertyDescriptor) {
        Object.defineProperty(target,
            `${propertyKey}${SerializableNode.get<string>(BaseComponent.config, BaseComponent.configKeys.reflector.name)}`
        , {
            get: (): IAutoRegister => ({
                type: 'MessageListener',
                params: [
                    input.mask,
                    input.priority,
                    input.state,
                    ...(input.tags || [])
                ]
            })
        });
    };
}
