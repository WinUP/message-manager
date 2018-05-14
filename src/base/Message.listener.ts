import { ListenerComponent, ReflectorName } from './ListenerComponent';

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
}

/**
 * Message listener
 * @param input Parameters
 */
export function MessageListener(input: IMessageListenerDefinition) {
    return function (target: ListenerComponent, propertyKey: string, descriptor: PropertyDescriptor) {
        const component: any = target;
        if (!Object.getOwnPropertyNames(component).includes(ReflectorName)) {
            Object.defineProperty(target, ReflectorName, { value: [], enumerable: true, configurable: true });
        }
        component[ReflectorName].push({
            target: propertyKey,
            type: 'MessageListener',
            params: [
                input.mask,
                input.priority,
                ...(input.tags || [])
            ]
        });
    };
}
