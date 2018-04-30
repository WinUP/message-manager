import { AdvancedTree, isMatch, SerializableNode, autoname, toPascalCase } from '@dlcs/tools';

import { IResponseMetadata, ResourceManager } from '../resource-manager';
import { MemoryCache, IMemoryCacheMessage } from '../memory-cache/memory-cache';
import { Listener, MessageService } from '../message';
import { IAutoRegister } from './AutoRegister';

/**
 * Configuration keys for BaseComponent
 */
export interface IBaseComponentConfigKeys {
    /**
     * Default listener priority
     * @default 100
     */
    priority: string;
    /**
     * Runtime reflector configuration
     */
    reflector: {
        /**
         * Reflector information object key suffix
         * @default '$AutoRegisterMetadata'
         */
        name: string;
    };
}

/**
 * Base component
 * @description Base comonent provides state management, services intergration, runtime reflection, etc.
 */
export abstract class BaseComponent {
    private _rootListener: AdvancedTree<Listener>;
    private _currentState: string = '';
    private _message: MessageService;
    private _stateListeners: { from: string | RegExp, to: string | RegExp, handler: (from: string, to: string) => void }[] = [];
    private static _config: SerializableNode = SerializableNode.create('base_component', undefined);
    private static _configKeys: IBaseComponentConfigKeys = { priority: '', reflector: { name: '' } };

    public static initialize(): void {
        autoname(BaseComponent._configKeys, '/', toPascalCase);
        SerializableNode.set(BaseComponent.config, BaseComponent.configKeys.priority, 100);
        SerializableNode.set(BaseComponent.config, BaseComponent.configKeys.reflector.name, '$AutoRegisterMetadata');
    }

    /**b
     * Get configuration
     */
    public static get config(): SerializableNode {
        return BaseComponent._config;
    }

    /**
     * Get configuration keys
     */
    public static get configKeys(): Readonly<IBaseComponentConfigKeys> {
        return BaseComponent._configKeys;
    }

    /**
     * Get or set component's state
     */
    public get state(): string {
        return this._currentState;
    } public set state(value: string) {
        this._stateListeners.forEach(listener => {
            if (isMatch(listener.from, this._currentState) && isMatch(listener.to, this._currentState)) {
                listener.handler(this._currentState, value);
            }
        });
        this._currentState = value;
    }

    /**
     * Get message service's instance
     */
    public get message(): MessageService {
        return this._message;
    }

    protected constructor(messageService: MessageService, priority?: number) {
        this._message = messageService;
        this._rootListener = this.message.listener
            .for(0)
            .hasPriority(priority || SerializableNode.get<number>(BaseComponent.config, BaseComponent.configKeys.priority))
            .listenAll()
            .receiver(m => m)
            .register();
        this.autowire();
    }

    /**
     * Destroy this component's message listeners
     */
    public destroy(): void {
        this._rootListener.destroy();
    }

    /**
     * Close this component's root listener
     */
    public closeRootListener(): void {
        this._rootListener.enabled = false;
    }

    /**
     * Open this component's root listener
     */
    public openRootListener(): void {
        this._rootListener.enabled = true;
    }

    /**
     * Add state listener
     * @param from From state
     * @param to To state
     * @param handler Listener
     */
    protected onState(from: string | RegExp, to: string | RegExp, handler: (from: string, to: string) => void): void {
        this._stateListeners.push({ from: from, to: to, handler: handler });
    }

    /**
     * Add message listener
     * @param target Listener
     */
    protected onMessage(target: Listener | AdvancedTree<Listener>): AdvancedTree<Listener> {
        if (target instanceof Listener) {
            return target.register(this._rootListener.content);
        } else {
            target.parent = this._rootListener;
            return target;
        }
    }

    /**
     * Add resource listener (only effect resource sent via message service)
     * @param address Resource address with protocol
     * @param addons Resource tag
     * @param state Component state
     * @param handler Handler
     * @param params Parameters as filter (All should be in one resource's param list to target it)
     */
    protected onResponse<T>(address: string | RegExp | undefined, tags: (string | RegExp)[] | undefined, state: string | undefined,
        params: { [key: string]: any } | undefined, handler: (data: IResponseMetadata) => void): AdvancedTree<Listener> {
        return this.onMessage(this.message.listener.for(
            SerializableNode.get<number>(ResourceManager.config, ResourceManager.configKeys.response.mask))
            .listen(SerializableNode.get<string>(ResourceManager.config, ResourceManager.configKeys.response.tag)).receiver(message => {
                const response: IResponseMetadata = message.value;
                if (!isMatch(address, `${response.request.protocol}://${response.request.address}`)
                    || !isMatch(state, this._currentState)) {
                    return message;
                }
                if (tags && tags.some(tag => response.request.tags.some(v => !isMatch(tag, v)))) {
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

    private findAutowiredFunctions(target: this): string[] {
        let props: string[] = [];
        do {
            if (target.constructor === BaseComponent.constructor) { break; }
            props = props.concat(Object.getOwnPropertyNames(target));
        } while (target = Object.getPrototypeOf(target));
        const reflectorName = SerializableNode.get<string>(BaseComponent.config, BaseComponent.configKeys.reflector.name);
        return props
            .filter(v => v.endsWith(reflectorName))
            .map(v => v.slice(0, v.length - reflectorName.length));
    }

    private autowire(): void {
        const functionNames: string[] = this.findAutowiredFunctions(this);
        for (let i = 0; i < functionNames.length; i++) {
            const key = functionNames[i];
            const register: IAutoRegister =
                (this as any)[`${key}${SerializableNode.get<string>(BaseComponent.config, BaseComponent.configKeys.reflector.name)}`];
            if (!register) {
                throw TypeError(`Cannot register ${key}: Function has no register data defined by any *Listener annotation`);
            }
            const metadata: Function = (this as any)[key];
            if (register.type === 'ResourceListener') {
                this.onResponse(register.params[0], register.params[1], register.params[2], register.params[3], data => {
                    metadata.call(this, data);
                });
            } else if (register.type === 'StateListener') {
                this.onState(register.params[0], register.params[1], (from, to) => {
                    metadata.call(this, from , to);
                });
            } else if (register.type === 'MessageListener') {
                let listener = this.message.listener.for(register.params[0]);
                if (register.params[1] != null) {
                    listener = listener.hasPriority(register.params[1]);
                }
                if (register.params.length > 3) {
                    for (let j = 3; j < register.params.length; j++) {
                        listener = listener.listen(register.params[j]);
                    }
                } else {
                    listener = listener.listenAll();
                }
                this.onMessage(listener.receiver(message => {
                    const tester = register.params[2] != null ? new RegExp(register.params[2]) : new RegExp('');
                    if (tester.test(this._currentState)) {
                        message = metadata.call(this, message);
                    }
                    return message;
                }));
            } else if (register.type === 'CacheListener') {
                this.onMessage(this.message.listener.for(
                    SerializableNode.get(MemoryCache.config, MemoryCache.configKeys.action.mask)
                ).listen(
                    SerializableNode.get(MemoryCache.config, MemoryCache.configKeys.action.tag)
                ).receiver(message => {
                    const data: IMemoryCacheMessage = message.value;
                    if (!isMatch(register.params[0], data.key)) { return message; }
                    metadata.call(this, data.key, data.old, data.new);
                    return message;
                }));
            }
        }
    }
}

BaseComponent.initialize();
