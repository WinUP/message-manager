import { ReflectorName } from './ListenerComponent';

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
     * Extra parameters
     */
    params?: { [key: string]: any };
}

/**
 * Resource listener
 * @param input Parameters
 */
export function ResourceListener(input: IResourceListenerDefinition) {
    return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
        const component: any = target;
        if (!Object.getOwnPropertyNames(component).includes(ReflectorName)) {
            Object.defineProperty(target, ReflectorName, { value: [], enumerable: true, configurable: true });
        }
        component[ReflectorName].push({
            target: propertyKey,
            type: 'ResourceListener',
            params: [
                input.address,
                input.tags,
                input.params
            ]
        });
    };
}
