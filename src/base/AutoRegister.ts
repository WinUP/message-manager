export interface IAutoRegister {
    target: string;
    type: 'ResourceListener' | 'StateListener' | 'MessageListener' | 'CacheListener';
    params: any[];
}
