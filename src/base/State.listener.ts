import { ListenerComponent, ReflectorName } from './ListenerComponent';

/**
 * State listener after state is changed
 * @description State listener only raised when value is really *changed*. At that time, changed part's old value
 * will be yout function's parameter.
 */
export function StateListener() {
    return function (target: ListenerComponent, propertyKey: string, descriptor: PropertyDescriptor) {
        const component: any = target;
        if (!Object.getOwnPropertyNames(component).includes(ReflectorName)) {
            Object.defineProperty(target, ReflectorName, { value: [], enumerable: true, configurable: true });
        }
        component[ReflectorName].push({
            target: propertyKey,
            type: 'StateListener'
        });
    };
}
