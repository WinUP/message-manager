import { cloneDeep } from 'lodash';
import { Component } from 'react';

import { ListenerComponent } from './ListenerComponent';

export class ReactAdjointListener<T extends { [key: string]: any } = {}> extends ListenerComponent<T> {
    /**
     * Get binded react component
     */
    public readonly reactComponent: Component;

    /**
     * Create a new react adjoint listener
     * @param reactComponent React component that needs to bind
     * @param initState Initial state
     * @param priority Root listener priority
     */
    public constructor(reactComponent: Component, initState: T = {} as any, priority: number = 100) {
        super(initState, priority);
        this.reactComponent = reactComponent;
        // 拦截组件卸载
        const unmountMethod = reactComponent.componentWillUnmount as Function;
        this.reactComponent.componentWillUnmount = (...args: any[]) => {
            this.destroy();
            if (unmountMethod) { unmountMethod.call(this.reactComponent, ...args); }
        };
        // 拦截状态转换
        const setState = this.reactComponent.setState.bind(this.reactComponent);
        this.reactComponent.setState = (state: any, callback?: () => void) => {
            this.state = state;
        };
        // 映射状态转换
        super.onState(() => setState(cloneDeep(this.state)));
        // 自动组装监听器
        ListenerComponent.autowire(this.reactComponent, this);
    }
}
