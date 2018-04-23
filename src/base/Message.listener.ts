import { SerializableNode } from '@dlcs/tools';

import { BaseComponent } from './BaseComponent';
import { AutoRegister } from './AutoRegister';

/**
 * Message listener parameters
 */
export interface MessageListenerDefinition {
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
export function MessageListener(input: MessageListenerDefinition) {
    return function (target: BaseComponent, propertyKey: string, descriptor: PropertyDescriptor) {
        Object.defineProperty(target, `${propertyKey}${SerializableNode.get<string>(BaseComponent.config, '/reflector/name')}`, {
            get: (): AutoRegister => ({
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
