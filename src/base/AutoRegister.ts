export interface AutoRegister {
    type: 'ResourceListener' | 'StateListener' | 'MessageListener';
    params: any[];
}
