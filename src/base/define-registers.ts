export const RegisterName = 'register:list';

export type ValueIndicator<T> = T | ((value: T) => boolean);

export interface IAutoRegister {
    target: string | symbol;
    type: AutoRegisterType;
    params: any[];
}

export enum AutoRegisterType {
    ResourceListener,
    StateListener,
    MessageListener,
    MemoryCacheListener
}

export function defineRegisters(target: any): IAutoRegister[] {
    const param = Reflect.defineClassMetadata(target);
    param.extra[RegisterName] = param.extra[RegisterName] ?? [];
    return param.extra[RegisterName];
}

export function getRegisters(target: any): IAutoRegister[] | undefined {
    const param = Reflect.getClassMetadata(target);
    if (param?.extra[RegisterName] == null) return undefined;
    return param.extra[RegisterName];
}
