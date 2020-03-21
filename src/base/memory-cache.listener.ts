import { ValueIndicator, AutoRegisterType, defineRegisters } from './define-registers';
import { IMemoryCacheMessage } from '../memory-cache';

/**
 * State listener parameters
 */
export interface ICacheListenerDefinition {
    /**
     * Cache's key
     */
    path: ValueIndicator<string>;
}

/**
 * State listener
 * @param input Parameters
 * @description Must not use on static function
 */
export function MemoryCacheListener(input: ICacheListenerDefinition) {
    return (target: object, propertyKey: string | symbol, _descriptor: TypedPropertyDescriptor<(entry: IMemoryCacheMessage) => void>): void => {
        defineRegisters(target).push({
            target: propertyKey,
            type: AutoRegisterType.MemoryCacheListener,
            params: [input.path]
        });
    };
}
