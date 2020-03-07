# Message Manager

[![npm](https://img.shields.io/npm/v/@ekifvk/message-manager.svg?style=flat-square)](https://www.npmjs.com/package/@dlcs/core)

Store, resource and message manager for single page application.

核心模块是一个由诸多服务和快捷方式组成的，以一个模仿Windows消息循环开发的消息队列为中心，为资源和状态管理、数据广播和拦截提供统一解决方案的浏览器兼容JavaScript模块。

与采用reducer/action的Redux以及使用依赖收集的Mobx相比，创作系统核心模块在易用性上不及Redux、在黑科技度上不如Mobx。不过，其在某些情况下会带来比上述二者更为自由、更为强大的功能，而其所主要服务的Deus Legem创作系统正满足这些条件：

* 组件存在频繁的跨级交互
* 时常需要数据和事件广播
* 数据来源多样
* 中央存储库(store)非常庞大且结构难以固定，部分数据需要在同一浏览器中跨页面同步

为此，创作系统核心模块使用消息循环为核心，通过消息队列处理数据广播和资源请求，并保证现代浏览器不同页面间的消息可以互通有无，借此实现了：

* 当用户在页面A登录后，页面B也能自动登录
* 页面A的AJAX请求返回的数据页面B也可以使用
* 对HTTP、localStorage或其他各种存储的请求都可以使用一种结构实现
* 异步消息拦截，例如路由跳转时弹出是否保存的对话框并等待用户确认
* 等等

- [Message Manager](#message-manager)
  - [MessageQueue (消息队列)](#messagequeue-%e6%b6%88%e6%81%af%e9%98%9f%e5%88%97)
    - [Listener (监听器)](#listener-%e7%9b%91%e5%90%ac%e5%99%a8)
    - [Message (消息)](#message-%e6%b6%88%e6%81%af)
  - [MemoryCache (中央存储库)](#memorycache-%e4%b8%ad%e5%a4%ae%e5%ad%98%e5%82%a8%e5%ba%93)
  - [ResourceManager (资源管理器)](#resourcemanager-%e8%b5%84%e6%ba%90%e7%ae%a1%e7%90%86%e5%99%a8)
    - [ResourceProtocol (协议提供方)](#resourceprotocol-%e5%8d%8f%e8%ae%ae%e6%8f%90%e4%be%9b%e6%96%b9)

*以下内容会包含很多示例代码，其中也有许多链式方法。除非特别提醒，否则它们都不是Immutable方法。*

<a id="messagequeue"></a>

## MessageQueue (消息队列)

```typescript
import { MessageQueue, SynchronizedMessage, AsynchronizedMessage, Listener, IMessageMetadata } from '@dlcs/core';
```

消息队列维护一个监听器列表，这个列表符合树结构，并在消息广播时按照**深度优先**权重**从高到底**遍历**未被关闭**的节点。

消息队列在同一程序实例中只允许存在一个，它表现为一个静态类，通过结构化拷贝算法（参考[MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)）实现跨页面数据传输，这导致它所处的浏览器必须支持SharedWorker，否则该部分功能不可用。同时，由于使用SharedWorker实现，启用跨页同步功能前必须设置Worker文件的位置（即本npm包内worker文件夹下的cross-share.js文件），凡是指向同一个Worker文件的页面都可分享各自的数据。

如果不设置Worker文件，则跨页面数据传输不可用，其他功能不受干扰。

<small>提示：文件位置不重要，重要的是内容和WebWorker的同源策略</small>

<a id="listener"></a>

### Listener (监听器)

监听器是对消息执行操作、或根据消息执行操作的主体，它的大部分函数都支持链式调用。

```typescript
const listener = MessageQueue.listener; // 生成一个新的监听器
listener
    .for(1) // 设置要监听的消息的掩码
    .listen('RESPONSE') // 监听特定的消息TAG（需满足掩码）
    .listenAll() // 监听该掩码下的所有消息，无论TAG为何
    .hasPriority(100) // 设置监听器的权重，在遍历兄弟节点时越大越先执行
    .asDisposable() // 该监听器将只执行一次
    .asUndisposable() // 该监听器可执行多次，直到被从消息循环中删除
    .receiver(message => message) // 监听器的消息处理函数，必须返回一个消息给之后的监听器使用
listener.isAvailableFor(1, 'RESPONSE') // 返回一个布尔值，标识这个监听器是否能处理该掩码和TAG的消息
listener.isAvailableFor(1) // 不给出TAG则只判断掩码
listener.parse(MessageQueue.asyncMessage) // 处理一条消息，这也是消息循环调用每个监听器的方法
listener.register() // 将监听器注册到消息循环（立即生效）
listener.register(MessageQueue.listener) // 如果给出一个其他监听器，则注册为那个监听器的子节点
```

<a id="message"></a>

### Message (消息)

消息有三种，常用的是同步消息和异步消息。最后一种名为“来自其他页面的消息”，它理论上只会被消息循环本身创建，也是一种特殊的异步消息。同步和异步消息除了广播函数的返回值不同外，其他用法基本相同。

如果没有特别需要，尽可能只使用异步消息，因为当监听器的处理函数需要执行异步操作且没有对同步消息进行特殊处理时，消息队列会抛出异常。

```typescript
const syncMessage = MessageQueue.syncMessage; // 生成一个同步消息
const message = MessageQueue.ayncMessage; // 生成一个新的异步消息，下面以此为例
message.value // 读取消息的内容
message.mask // 读取消息的掩码
message.tag // 读取消息的TAG
message.asynchronized // 确定这是否是异步消息
message.isCrossShare // 确定这是否是来自其他页面的消息
message
    .mark(1, 'RESPONSE') // 设置消息的掩码和TAG
    .use({ key1: 'some content' }) // 设置消息的内容
    .ignoreCrossShare() // 无论消息队列设置为何，不要和其他页面分享此消息
    .enableLazyShare() // 本页面全部监听器都处理完后再分享消息，而不是处理前
    .toSynchronized() // 复制为同步消息，这是一个Immutable方法
    .toAsynchronized() // 复制为异步消息，这是一个Immutable方法
    .send() // 发送此消息。异步消息会返回内容是消息本身的Promise，同步消息则直接返回消息本身（当然返回前会先被消息循环处理）
```

<a id="memorycache"></a>

## MemoryCache (中央存储库)

```typescript
import { MemoryCache, IMemoryCacheMessage } from '@dlcs/core';
```

中央存储库是一个可序列化树，它可以保存应用程序的数据，并在数据发生变化时通过消息循环广播该变化。与消息队列相同，它在同一程序实例中只允许存在一个。每次广播变化时，消息的内容符合```IMemoryCacheMessage```结构。

```typescript
MemoryCache.has('/state/user/name') // 判断节点/state/user/name的数据是否不为undefined
MemoryCache.set('/state/user/name', 'test name') // 设置节点/state/user/name的数据
MemoryCache.get<number>('/state/user/name') // 从/state/user/name节点读取数据
MemoryCache.inject((key, value) => value) // 设置一个拦截器，用来在数据被存入节点前改变数据内容
const data = MemoryCache.dump() // 转储存储库的数据
MemoryCache.restore(data) // 恢复转储的数据

// 以下是设置部分
// !设置要尽早修改好，因为这些都不是引用对象，修改不会对已经用过它们的东西生效
MemoryCache.config.action.mask = 1 // 设置消息广播的掩码
MemoryCache.config.action.tag = 'ACTION' // 设置消息广播的TAG
MemoryCache.config.action.restoreTag = 'MEMORY_CACHE_RESTORE' // 恢复转储时消息广播的TAG

// 下面这个消息循环监听器可以监听中央存储库的修改
MessageQueue.listener
    .for(MemoryCache.config.action.mask)
    .listen(MemoryCache.config.action.tag)
    .receiver(message => ......)
    .register()
```

<a id="resourcemanager"></a>

## ResourceManager (资源管理器)

```typescript
import { ResourceManager, ResourceProtocol, ResourceRequest, ResourceResponse, InjectorTimepoint, IResponseMetadata } from '@dlcs/core';
```

资源管理器的设置目的是提供一个统一接口允许业务代码从各种不同位置拿取数据、而无需关心数据如何被拿取或存放在何处。与中央存储库相同，它在同一程序实例中只允许存在一个。资源管理器必须有至少一个协议提供方才能正常工作，且通过资源管理器获取的资源都必须有唯一的URI：

    [资源协议]://[资源地址]

如 ```http:///www.google.com```，```storage:///state/user/token```，```file:///index.js``` 等。

```typescript
ResourceManager.registerProtocol(new LocalStorageProtocol()) // 注册协议提供方（需要从其他npm包获取）
ResourceManager.inject(InjectorTimepoint.OnSucceed | InjectorTimepoint.OnFailed, (request, response, data, time) => data) // 设置一个拦截器，拦截请求成功或请求失败
const request = ResourceManager.request // 生成一个资源请求

// 以下是设置部分
// !设置要尽早修改好，因为这些都不是引用对象，修改不会对已经用过它们的东西生效
ResourceManager.config.response.mask = 1 // 设置消息广播的掩码
ResourceManager.config.response.tag = 'RESPONSE' // 设置消息广播的TAG

// 资源管理器还有一些API，但由于存在更更用的封装，此处不想介绍
```

<a id="resourceprotocol"></a>

### ResourceProtocol (协议提供方)

在开发创作系统的过程中共发布了两款协议提供方，一个是[Angular HttpClient提供器](https://github.com/WinUP/dlcs-provider-angular-http)，一个是[HTML5 LocalStorage提供器](https://github.com/WinUP/dlcs-provider-local-storage)。

```typescript
ResourceManager.registerProtocol(new StorageProtocol());
ResourceManager.registerProtocol(new AngularHttpProtocol(httpClient)); // 需要Angular 5+支持
```

从零创造一个协议提供方也很简单，只要继承ResourceProtocol类并实现两个虚方法即可。

```typescript
public abstract request(request: ResourceRequest, injector?: (data: any, timepoint: InjectorTimepoint) => any): Observable<any>; // 异步请求

public abstract requestSync(request: ResourceRequest, injector?: (data: any, timepoint: InjectorTimepoint) => any): any; // 同步请求，不支持时直接抛出错误即可
```

```injector```参数是资源管理器封装的拦截器调用。如果它存在，所有协议提供方都应该在恰当的时机以```InjectorTimepoint.BeforeSend```（请求执行前）和```InjectorTimepoint.AfterSent```（请求执行后且完成前）作为时间点调用它。

<a id="resourcerequest"></a>

### ResourceRequest (资源请求)

资源请求是唯一一种请求资源的方式。

```typescript
const request = ResourceManager.request // 首先生成一个请求
request.address // 获取请求的地址（不包括协议部分）
request.protocol // 获取请求的协议
request.provider // 获取该请求的提供方，可能为空
request.content // 获取请求的内容
request.type // 获取请求的类型，有提交、获取、删除三种
request.params // 获取请求的参数
request.tags // 获取请求的TAG（如果有）
request
    .to('remote:///state/user/password') // 设置请求的URI，同时也会自动查找协议提供方
    .as(RequestType.Submit) // 设置请求的类型
    .submit('qwer') // 设置请求的内容，同时submit函数会自动把类型设置为RequestType.Submit（即上一行不必要）
    .param({ oauth_id: '...', access_token: '...' }) //设置请求的参数
    .tag('1', 'a', '3') // 给请求加TAG
request.send() // 发送请求并等待消息循环返回结果，只有这种方式能够被跨页分享
request.require() // 直接发送请求并返回Observable，不通过消息循环
request.requireSync() // 与上一行相同，但要求以同步方式获取资源，有可能在不支持同步获取的协议提供方上导致错误
```

<a id="resourceresponse"></a>

### ResourceResponse<T> (资源回执)

资源回执包含了资源请求本身、回执内容和请求状态（成功、失败等）。

```typescript
const response = request.require() // 通过require或requireSync得到原始ResourceResponse对象。如果是send，则只能从消息循环得到IResponseMetadata（请求和回执的元数据）
response.responseData // 获取回执的内容。异步请求时这是一个Observable，同步请求时这是资源本身
response.status // 获取回执的状态
response.request // 获取回执对应的请求
```

<a id="listenercomponentt"></a>

## ListenerComponent<T> （监听器组件）

```typescript
import { ListenerComponent, MessageListener, StateListener, ResourceListener, CacheListener } from '@dlcs/core';
```

基础组件是对应着消息循环中一个监听器的抽象类，它提供多种快捷方式允许业务代码绑定至上述任何服务。

```typescript

interface TestState {
    signed: boolean;
    user: {
        name: string,
        nickname: string,
        permissions: string[]
    }
}

export class UserComponent extends ListenerComponent<TestState> {
    public constructor() {
        super({ signed: false, user: { name: '', nickname: ''. permissions: [] } }, 100);
        // 第一个参数是初始状态。状态变化采用类似MobX的方式监听，因此必须一开始便保证对象的键(key)都存在。
        // 或者可以在恰当的时机调用this.recreateStateObservers()重新绑定监听（存在一定性能消耗）
        // 第二个参数是组件根监听器的优先级。除了状态监听器外，所有监听器都是消息循环监听器的某种封装。
    }

    // 这是一个资源监听器，可以配置地址、TAG和请求参数的过滤，能够监听RequestMode为ViaMessageService的请求。
    // 监听器对应的处理函数接受一个参数，类型为资源管理器部分的IResponseMetadata接口（回执元数据）
    @ResourceListener({ address: undefined, tags: ['user_profile'], params: undefined })
    public onResponseListener(response: IResponseMetadata): void {
        console.log(response.responseData);
    }

    // 这是一个消息监听器，必须配置掩码过滤、可以配置TAG过滤，同时也可以配置优先级，
    // 不过它在整个消息循环中的优先级受制于组件本身根监听器的优先级（因为它是根监听器的子节点）
    @MessageListener({ mask: 0B0110, priority: 100, tags: undefined })
    public onMessageListener(message: Message): void {
        console.log(message.value);
    }

    // 这是一个状态监听器，没有过滤参数。
    // 监听器对应的处理函数接受一个参数，类型为构造组件时使用的State结构（此处为TestState）的子集，
    // 具体是哪一部分子集取决于这次哪些State发生了变化
    @StateListener()
    public onStateListener(previous: TestState): void {
        console.log(previous);
    }

    // 这是一个中央存储库监听器，必须配置要监听的数据在中央存储库的路径。
    // 监听器对应的处理函数接受一个参数，类型为中央存储库广播的变更消息的主体，即IMemoryCacheMessage接口
    @CacheListener({ key: '/state/user/token' })
    public onCacheListener(data: IMemoryCacheMessage): void {
        console.log(data);
    }
}

const instance = new UserComponent(); // 声明一个组件

// 关于修改State的小技巧
instance.beginCacheStateChanges(); // 每次改变State都会导致监听器调用，不过我们可以缓存这种调用
instance.state.user.name = 'test';
instance.state.user.nickname = 'test_nick';
instance.state.signed = true;
instance.finishCacheStateChanges(); // 由于已经缓存，这会导致上面的修改被一次性传递给状态监听器，而不是分三次
// 状态监听器每次接收到的都是State对象内一级结构的变化，因此上面三行实际上会令监听器收到整个旧的State对象，
// 因为我们把仅有的两个一级字段都改了

// ! 一定要在组件变得无用时调用destroy()销毁所有监听器 !
instance.destroy(); // 如果是在其他框架中，将this.destroy()放入对应的销毁函数（如Angular的onDestroy）中即可
```

<a id="angular"></a>

### Angular解决方案

Angular可以直接使用基础组件，只要令Component继承ListenerComponent即可。

<a id="react"></a>

### React解决方案

在React中，由于唯一一个继承关系已经被React.Component占用，基础组件必须以伴随组件的方式出现。具体来说，React使用基础组件的方式是在React组件内声明一个类型为```ReactAdjointListener```的字段，并在恰当的时机将其初始化（推荐在构造函数或```componentWillMount```中），之后React组件的state和伴随组件的state将会双向绑定，并且定义在React组件上的动态加载方法也能被正确加载。React组件也不再需要手动调用```destroy()```方法，它已被自动包装在```componentWillUnmount```中。

```typescript
interface TestState {
    signed: boolean;
    user: {
        name: string,
        nickname: string,
        permissions: string[]
    }
}

export class UserReactComponent extends React.Component<{}, TestState> {
    private listener: ReactAdjointListener;
    public constructor() {
        super({});
        this.listener = new ReactAdjointListener(this, {
            signed: false, user: { name: '', nickname: ''. permissions: [] }
        }, 100); // 第一个参数为React组件，后面的参数和一般基础组件相同
    }

    // 接下来声明几个监听器

    @ResourceListener({ address: undefined, tags: ['user_profile'], params: undefined })
    public onResponseListener(response: IResponseMetadata): void {
        console.log(response.responseData);
    }

    @MessageListener({ mask: 0B0110, priority: 100, tags: undefined })
    public onMessageListener(message: Message): void {
        console.log(message.value);
    }

    @StateListener()
    public onStateListener(previous: TestState): void {
        console.log(previous);
    }

    @CacheListener({ key: '/state/user/token' })
    public onCacheListener(data: IMemoryCacheMessage): void {
        console.log(data);
    }
}

const instance = new UserReactComponent(); // 声明一个组件

instance.listener.state.signed = true; // 这一行会自动触发React组件的setState()函数
instance.setState({
    signed: true, user: { name: 'test', nickname: 'Test'. permissions: [] }
}); // 这一行同样也会调用声明的onStateListener()监听器（等同于state完整替换，即instance.listener.state = {...}）
```
<a id="component"></a>

### Component进阶用法

从1.2.1版开始，```ListenerComponent```的三个静态方法对外开放：

- 从任意实例的原型链上寻找可自动组装的方法（即那一大堆Listener注解）的方法
- 自动组装方法
- 关联基础组件的状态监听器和特定对象的方法

同时，手动调用基础组件状态监听器的方法也对继承的组件内部开放使用。

```typescript
// TestState还是上面那个TestState
export class UserComponent extends ListenerComponent<TestState> {
    // 下面这一大块不赘述了
    public constructor() {
        super({ signed: false, user: { name: '', nickname: ''. permissions: [] } }, 100);
    }
    @ResourceListener({ address: undefined, tags: ['user_profile'], params: undefined })
    public onResponseListener(response: IResponseMetadata): void {
        console.log(response.responseData);
    }
    @MessageListener({ mask: 0B0110, priority: 100, tags: undefined })
    public onMessageListener(message: Message): void {
        console.log(message.value);
    }
    @StateListener()
    public onStateListener(previous: TestState): void {
        console.log(previous);
    }
    @CacheListener({ key: '/state/user/token' })
    public onCacheListener(data: IMemoryCacheMessage): void {
        console.log(data);
    }

    // 从这里开始介绍新功能
    public testFunction(): void {
        this.callStateListeners({ signed: true }); // 这可以在不真的改变state的情况下强行调用一波状态监听器
        // beginCacheStateChanges()和finishCacheStateChanges()对上一行也有效
        // 这是一个protected方法
    }
}

// 其他新功能
const instance = new UserComponent();

// 1. findAutowiredFunctions方法
const methods: IAutoRegister[] = ListenerComponent.findAutowiredFunctions(instance);
// 上面一行可以得到一个数组，内容是UserComponent上所有被标记为自动组装的方法的描述

// 2. autowire方法
const instance2 = new UserReactComponent(); // 首先声明一个上面用过的React组件
ListenerComponent.autowire(instance2, instance); // 这可以把定义在instance2上的自动组装方法全部加载到instace上
// ReactAdjointListener的实现原理正是上面这一行

// 3. createObserver方法
const anotherState = { blocked: false };
ListenerComponent.createObserver(anotherState, instance, anotherState);
// 上面一行可以令instance(参数2)的状态监听器监听anotherState(参数3)的变化，并在发生变化时以anotherState(参数1)为根对象调用instance上的状态监听器
const state3 = { hasDashboard: true, dashboards: [] };
ListenerComponent.createObserver(state3, instance, state3.dashboards, 'dashboards');
// 另一种用法，令instance上的状态监听器只监听state3里dashboards的变化。

// 注：手动调用createObserver方法我觉得很废，既然要监控，为何不干脆定义到state里面去呢。
```
