import { defineRegisters, AutoRegisterType } from './define-registers';
import { ListenerReceiver } from '../message';

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

type ListenerReceiverSignature<T> = T extends any ? TypedPropertyDescriptor<(...args: Parameters<ListenerReceiver>) => T> : never;

/**
 * Message listener
 * @param input Parameters
 * @description Must not use on static function
 */
export function MessageListener(input: IMessageListenerDefinition) {
    return (target: object, propertyKey: string | symbol, _descriptor: ListenerReceiverSignature<ReturnType<ListenerReceiver>>): void => {
        defineRegisters(target).push({
            target: propertyKey,
            type: AutoRegisterType.MessageListener,
            params: [
                input.mask,
                input.priority,
                ...(input.tags || [])
            ]
        });
    };
}
