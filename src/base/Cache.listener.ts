import { ListenerComponent, ReflectorName } from './ListenerComponent';

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
    return function (target: ListenerComponent, propertyKey: string, descriptor: PropertyDescriptor) {
        const component: any = target;
        if (!Object.getOwnPropertyNames(component).includes(ReflectorName)) {
            Object.defineProperty(target, ReflectorName, { value: [], enumerable: true, configurable: true });
        }
        component[ReflectorName].push({
            target: propertyKey,
            type: 'CacheListener',
            params: [input.key]
        });
    };
}
