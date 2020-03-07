import type { IMemoryCacheMessage } from '../memory-cache';
import type { ValueIndicator } from './define-registers';
import { defineRegisters, AutoRegisterType } from './define-registers';

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
