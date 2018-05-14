import { AdvancedTree, isMatch } from '@dlcs/tools';
import { cloneDeep } from 'lodash';

import { IResponseMetadata, ResourceManager } from '../resource-manager';
import { MemoryCache, IMemoryCacheMessage } from '../memory-cache/memory-cache';
import { Listener, MessageQueue } from '../message';
import { IAutoRegister } from './AutoRegister';

export const ReflectorName = '$$RegisterMetadata$$';

/**
 * Listener component
 * @description Listener component provides state management, services intergration, runtime reflection, etc.
 */
export abstract class ListenerComponent<T extends { [key: string]: any } = {}> {
    private _rootListener: AdvancedTree<Listener>;
    private _currentState: number = 0;
    private _stateListeners: ((diff: { [key: string]: any }) => void)[] = [];
    private _state: T;
    private stateChangeCache: { [key: string]: any } | undefined;

    /**
     * Get, set or replace component's state
     * @description Unless no other method, do not replace whole state object
     */
    public get state(): T {
        return this._state;
    } public set state(value) {
        this._stateListeners.forEach(listener => listener(value));
        this._state = this.createObserver(this._state);
    }

    /**
     * Get component's root listener
     */
    public get rootListener(): AdvancedTree<Listener> {
        return this._rootListener;
    }

    /**
     * Create a new listener component
     * @param initState Initial state
     * @param priority Root listener priority
     * @description Observers under State are similar to Mobx, which means keys created after constructor cannot
     * be observed.
     */
    protected constructor(initState: T = {} as any, priority: number = 100) {
        this._rootListener = MessageQueue.listener
            .for(0)
            .hasPriority(priority)
            .listenAll()
            .receiver(m => m)
            .register();
        this._state = initState;
        this.createObserver(this._state);
        this.autowire();
    }

    /**
     * Destroy this component's message listeners
     */
    public destroy(): void {
        this._rootListener.destroy();
    }

    /**
     * Create a deep cloned copy of state object then reset state to this new value
     * @description This method will not trigger state listeners
     */
    public recreateStateObservers(): void {
        this._state = this.createObserver(cloneDeep(this._state));
    }

    /**
     * Stop call state change listeners but record all changes in cache
     * @description This function can only stop call listeners, not state object's changes.
     */
    public beginCacheStateChanges(): void {
        this.stateChangeCache = this.stateChangeCache || {};
    }

    /**
     * Resume call state change listeners. If state changes cache is not undefined, call listeners once immediately.
     */
    public finishCacheStateChanges(): void {
        if (this.stateChangeCache) {
            this._stateListeners.forEach(listener => listener(this.stateChangeCache!));
        }
        this.stateChangeCache = undefined;
    }

    /**
     * Add after state changed listener
     * @param handler Listener.
     * First paramater is the deep clone level-1 item of current state that will be changed.
     */
    public onState(handler: (diff: { [key: string]: any }) => void): void {
        this._stateListeners.push(handler);
    }

    /**
     * Add message listener
     * @param target Listener
     */
    public onMessage(target: Listener | AdvancedTree<Listener>): AdvancedTree<Listener> {
        if (target instanceof Listener) {
            return target.register(this._rootListener.content);
        } else {
            target.parent = this._rootListener;
            return target;
        }
    }

    /**
     * Add resource listener (only effect resource sent via message service)
     * @param handler Handler
     * @param address Resource address with protocol
     * @param tags Resource tag
     * @param params Parameters as filter (All should be in one resource's param list to target it)
     */
    public onResponse<U = any>(handler: (data: IResponseMetadata<U>) => void,
        address?: string | RegExp, tags?: (string | RegExp)[], params?: { [key: string]: any }): AdvancedTree<Listener> {
        return this.onMessage(MessageQueue.listener
            .for(ResourceManager.config.response.mask)
            .listen(ResourceManager.config.response.tag)
            .receiver(message => {
                const response: IResponseMetadata = message.value;
                if (!isMatch(address, `${response.request.protocol}://${response.request.address}`)) {
                    return message;
                }
                if (tags && tags.some(tag => response.request.tags.every(v => !isMatch(tag, v)))) {
                    return message;
                }
                if (params && Object.keys(params).some(key => response.request.params[key] !== params[key])) {
                    return message;
                }
                handler(response);
                return message;
            })
        );
    }

    /**
     * Add after memory cache changed listener
     * @param handler Handler
     * @param path Cache's path
     */
    public onCache(handler: (data: IMemoryCacheMessage) => void, path?: string): void {
        this.onMessage(MessageQueue.listener
            .for(MemoryCache.config.action.mask)
            .listen(MemoryCache.config.action.tag)
            .receiver(message => {
                const data: IMemoryCacheMessage = message.value;
                if (!isMatch(path, data.path)) { return message; }
                handler(data);
                return message;
            }));
    }

    /**
     * 寻找原型链上所有自动组装定义
     * @param target 起始寻找目标
     */
    private findAutowiredFunctions(target: this): IAutoRegister[] {
        let props: IAutoRegister[] = [];
        do {
            // 不从比ListenerComponent更早的元素寻找
            if (target.constructor === ListenerComponent.constructor) { break; }
            if (Object.getOwnPropertyNames(target).includes(ReflectorName)) {
                props = props.concat((target as any)[ReflectorName]); // 合并组装定义数组
            }
        } while (target = Object.getPrototypeOf(target)); // 获取原型链上一级
        return props;
    }

    /**
     * 自动组装
     */
    private autowire(): void {
        const registers: IAutoRegister[] = this.findAutowiredFunctions(this);
        for (let i = 0; i < registers.length; i++) {
            const register: IAutoRegister = registers[i];
            const metadata: Function = (this as any)[register.target];
            if (register.type === 'ResourceListener') {
                this.onResponse(data => {
                    metadata.call(this, data);
                }, register.params[0], register.params[1], register.params[2]);
            } else if (register.type === 'StateListener') {
                this.onState(diff => metadata.call(this, diff));
            } else if (register.type === 'MessageListener') {
                let listener = MessageQueue.listener.for(register.params[0]);
                if (register.params[1] != null) {
                    listener = listener.hasPriority(register.params[1]);
                }
                if (register.params.length > 2) {
                    for (let j = 2; j < register.params.length; j++) {
                        listener = listener.listen(register.params[j]);
                    }
                } else {
                    listener = listener.listenAll();
                }
                this.onMessage(listener.receiver(message => {
                    message = metadata.call(this, message);
                    return message;
                }));
            } else if (register.type === 'CacheListener') {
                this.onCache(metadata.bind(this), register.params[0]);
            }
        }
    }

    /**
     * 创建状态监听器
     * @param source 要监听的对象
     * @param rootKey 对应的state根路径键名（如果要监听的对象不是state根对象）
     */
    private createObserver(source: any, rootKey?: string): any {
        if (source instanceof Array) { // 拦截数组调用
            return typeof Proxy !== 'undefined' ? new Proxy<any[]>(source, {
                set: (obj, name: any, value) => {
                    if (value === obj[name]) {
                        return true;
                    }
                    const oldValue = cloneDeep(this._state[rootKey!]);
                    obj[name] = value;
                    if (value instanceof Object) { // 递归处理新对象
                        obj[name] = this.createObserver(value, rootKey);
                    }
                    if (name !== 'length') { // 排除长度操作
                        this.callStateListener(rootKey!, oldValue);
                    }
                    return true;
                }
            }) : source;
        } else if (typeof source === 'object') {
            Object.keys(source).filter(key => source.hasOwnProperty(key)).forEach(key => {
                // 存储原始值
                let valueReference = source[key];
                Object.defineProperty(source, key, {
                    get: () => {
                        return valueReference;
                    },
                    set: (value) => {
                        if (value === valueReference) {
                            return;
                        }
                        const oldValue = cloneDeep(this._state[rootKey || key]);
                        valueReference = value;
                        // 如果是对象赋值，重新递归处理所有子对象
                        if (typeof valueReference === 'object') {
                            valueReference = this.createObserver(valueReference, rootKey || key);
                        }
                        this.callStateListener(rootKey || key, oldValue);
                    }
                });
                // 递归处理所有子对象
                if (typeof valueReference === 'object') {
                    valueReference = this.createObserver(valueReference, rootKey || key);
                }
            });
            return source;
        } else {
            throw new TypeError(`Cannot create state observer: State is not object`);
        }
    }

    /**
     * 触发所有状态监听器（或放入缓存）
     * @param key 出现变化的state根键名
     */
    private callStateListener(key: string, value: any): void {
        if (this.stateChangeCache) {
            this.stateChangeCache[key] = value;
        } else {
            const data = { [key]: value };
            this._stateListeners.forEach(listener => listener(data));
        }
    }
}
