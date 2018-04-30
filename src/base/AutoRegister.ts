export interface IAutoRegister {
    type: 'ResourceListener' | 'StateListener' | 'MessageListener' | 'CacheListener';
    params: any[];
}
