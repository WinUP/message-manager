# DLCS Core Module

![status](https://img.shields.io/travis/WinUP/dlcs-core.svg?style=flat-square)
[![npm](https://img.shields.io/npm/v/@dlcs/core.svg?style=flat-square)](https://www.npmjs.com/package/@dlcs/core)

Core module includes two services: message service and resource manager. It provides universal resource management and event-based global message loop for Deus Legem Creation System.

### Message Service

```typescript
import { MessageService, SynchronizedMessage, AsynchronizedMessage, Listener, MessageMetadata } from '@dlcs/core';
```

Message service is an event-based message queue. Component can register listeners or send messages to it. Message service will broadcast all messages to every listener, also listener has filters to indicate which kind of message should be delivered. Message service can let all components send and get data from others without parent-child relationship, can raise events with customized content, generally also handles all XHR responses from server.

Deus Legem Creation System using message service to share data between different tabs in same browser (called cross share). only data supports the structured clone algorithm (see [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)) can use in cross share.

Before send any message, application should at least register one listener. 

#### Listener

Listener can be created by using message service (we asume that MessageServive's instance name is messageService):

```typescript
const listener = messageService.listener; // Will return a new listener
```

Then set params for listener. We designed most of methods as chainable but also mutable methods.

| Field name | Default value | Usage        | Example |
|-|:-|:-|-:|
| ```id: string``` | Given by constructor | Get listener's ID | ```const id = listener.id``` |
| ```mask: number``` | ```0``` | Get listener's mask | ```const mask = listener.mask``` |
| ```disposable: boolean``` | ```false``` | Indicate if listener is disposable (only run once) | ```const disposable = listener.disposable``` |
| ```priority: number``` | ```0``` | Get listener's priority | ```const priority = listener.priority``` |
| ```for(mask: number): this``` | | Set listener's mask | ```listener.for(0b0110)``` |
| ```listen(tag: string): this``` | | Listen target tag | ```listener.listen('RESPONSE').listen('ERROR')``` |
| ```listenAll(): this``` | | Listener all tags under final mask | ```listener.listenAll()``` |
| ```hasPriority(priority: number): this``` | | Set listener's priority | ```listener.hasPriority(100)``` |
| ```isAvailableFor(mask: number, tag: Nullable<string>): boolean``` | | Indicate if listener can listen target message type | ```const available = listener.isAvailableFor(0B0010, 'RESPONSE')``` |
| ```asDisposable(): this``` | | Set listener as disposable | ```listener.asDisposable()``` |
| ```asUndisposable(): this``` | | Set listener as undisposable | ```listener.asUndisposable()``` |
| ```receiver(target: (message: Message) => Message \| Observable<Message> \| Promise<Message>): this``` | | Set listener's receiver function | ```listener.receiver((message) => (new Promise((resolve, reject) => resolve(message))))``` |
| ```parse(message: Message): Message \| Observable<Message> \| Promise<Message>``` | | Parse a message | ```const result = listener.parse(message)``` |
| ```register(parent?: Listener): AdvancedTree<Listener>``` | |  Register this listener to message service | ```listener.register()``` |

For example, if we want a listener listen message with mask 0B0010 and 0B0100 with any tag, using priority 100 under root listener:

```typescript
const listener = messageService.listener.for(0B0110).listenAll().hasPriority(100).register();
```

#### Message

There are three kinds of message: ```SynchronizedMessage```, ```AsynchronizedMessage``` and ```SharedMessage```. ```SharedMessage``` is a special kind of ```AsynchronizedMessage``` and the only one kind of message that ```isCrossShare``` equals true.

| Field name | Default value | Usage        | Example |
|-|:-|:-|-:|
| ```id: string``` | Given by constructor | Get message's ID | ```const id = message.id``` |
| ```tag: string``` | ```''``` | Get message's tag | ```const tag = message.tag``` |
| ```mask: number``` | ```0``` | Get message's mask | ```const mask = message.mask``` |
| ```asynchronized: boolean``` | Depends of message type | Indicate if this message is asynchronized | ```const asynchronized = message.asynchronized``` |
| ```isCrossShare: boolean``` | Depends of message type | Indicate if this message is synchronized | ```const isCrossShare = message.isCrossShare``` |
| ```metadata: MessageMetadata``` | Generate in each call | Get message's metadata | ```const metadata = message.metadata``` |
| ```value: any``` | | Get message's content | ```const value = message.value``` |
| ```mark(mask: number, tag: string): this``` | | Set message's mask and tag | ```message.mark(0B0010, 'RESPONSE')``` |
| ```use<T>(value: T)``` | | Set message's content | ```message.use<string>('123')``` |
| ```enableLazyShare()``` | | Enable lazy mode in cross share | ```message.enableLazyShare()``` |
| ```disableLazyShare()``` | | Disable lazy mode in cross share | ```message.disableLazyShare()``` |

Lazy mode means cross share only starts when all suitable listener had processed message, regularly it starts immediately when get the message.

```SynchronizedMessage``` has two extra methods:

| Field name | Default value | Usage        | Example |
|-|:-|:-|-:|
| ```toAsynchronized(): AsynchronizedMessage``` | | Copy this message as asynchronized message | ```const asychronized = message.toAsynchronized()``` |
| ```send(): SynchronizedMessage``` | | Send this message to message service | ```const result = message.send()``` |

```AsynchronizedMessage``` also has two extra methods:

| Field name | Default value | Usage        | Example |
|-|:-|:-|-:|
| ```toSynchronized(): SynchronizedMessage``` | | Copy this message as synchronized message | ```const synchronized = message.toSynchronized()``` |
| ```send(): Promise<AsynchronizedMessage>``` | | Send this message to message service | ```const result = await message.send()``` |

```SharedMessage``` only has one extra method:

| Field name | Default value | Usage        | Example |
|-|:-|:-|-:|
| ```send(): Promise<AsynchronizedMessage>``` | | Send this message to message service | ```const result = await message.send()``` |

Message can be created by using ```MessageService```:

```typescript
const asynchronizedMessage = this.messageService.asyncMessage; // Asynchronized message
const synchronizedMessage = this.messageService.syncMessage; // Synchronized message
```

For example, if we want to send a message with mask 0B0010, tag 'RESPONSE', and content '123' in asynchronized way:

```typescript
const result = await this.messageService.asyncMessage.as(0B0010, 'RESPONSE').use<string>('123').send();
```

#### Cross share

Running context must supports SharedWorker ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker)) to use cross share.

If cross share is enabled, when message service receives a message, it will copy its data to a new ```SharedMessage``` instance and send to worker. Worker will broadcast the copied message to all tabs in same browser under same domain name. Which means, if there are more than one application instances opened in same browser, all of them will share their received messages.

For example, if we opened two same tabs of our application and send a message to message service in tab 1, both tab 1 and tab 2 will receive this message.

Cross share can not send function.

### Resource Manager

As another important part of Deus Legem Creation System, resource manager provides an unique way to request or submit resources from or to server, local storage, assets forder, or any other place by register protocol providers. 

```typescript
import { ResourceManager, Request, Response, Injector, ResourceProtocol, ResourceRequest, ResourceResponse } from '@dlcs/core';
```

APIs for ```ResourceManager```:

| Field name | Default value | Usage        | Example |
|-|:-|:-|-:|
| ```request: ResourceRequest``` | | Prepare a request | ```const request = resourceManager.request``` |
| ```apply<T>(request: ResourceRequest, mode: RequestMode): void \| ResourceResponse<T \| Observable<T>>``` | | Send request | ```const result = resourcemanager.apply(request, RequestMode.ViaMessageService)``` |
| ```callInjectors(request: ResourceRequest, response: ResourceResponse<any>, responseData: any, timepoint: Injector.InjectorTimepoint): any``` | | Call injectors | ```const data = resourcemanager.callInjectors(request, response, {}, Injector.InjectorTimepoint.BeforeSend)``` |
| ```registerProtocol(protocol: ResourceProtocol): boolean``` | | Register resource protocol | ```resourcemanager.registerProtocol(protocol)``` |
| ```findProtocol(protocol: string): Nullable<ResourceProtocol>``` | | Find resource protocol provider | ```const protocol = resourcemanager.findProtocol('http')``` |
| ```inject(timepoint: number, injector: Injector.RequestInjector): void``` | | Register an injector | ```resourcemanager.inject(0B00110, (request, response, data, timepoint) => data)``` |

Remember that ```apply()``` and ```callInjectors()``` are not recommend to access request or injectors. By using ```ResourceRequest```, there is another convenient way to communicate with resource manager.

To use resource manager, application must register at least one protocol provider to it. Deus Legem Creation System provides [http](https://github.com/WinUP/dlcs-provider-angular-http) and [localStorage](https://github.com/WinUP/dlcs-provider-local-storage) provider in other packages.

```typescript
resourceManager.registerProtocol(new StorageProtocol());
resourceManager.registerProtocol(new AngularHttpProtocol(httpClient));
```

#### Resource Request

Way to generate empty request:

```typescript
const request = this.resourceManager.request;
```

| Field name | Default value | Usage        | Example |
|-|:-|:-|-:|
| ```address: string``` | ```''``` | Get request's address | ```const address = request.address``` |
| ```protocol: string``` | ```''``` | Get request's protocol | ```const protocol = request.protocol``` |
| ```provider: Nullable<ResourceProtocol>``` | ```null``` | Get request's protocol provider | ```const provider = request.provider``` |
| ```content: any``` | ```undefined``` | Get request's content | ```const content = request.content``` |
| ```type: Request.RequestType``` | ```Request.RequestType.Request``` | Get request's type | ```const type = request.type``` |
| ```params: { [key: string]: any }``` | ```{}``` | Get request's params | ```const params = request.params``` |
| ```tags: string[]``` | ```[]``` | Get request's tags | ```const addons = request.addons``` |
| ```metadata: Request.RequestMetadata``` | Generate in each call | Get request's metadata | ```const metadata = request.metadata``` |
| ```to(uri: string): this``` |  | Set request's URI | ```request.to('storage:///user/state/token')``` |
| ```as(type: Request.RequestType): this``` |  | Set request's type | ```request.as(Request.RequestType.Submit)``` |
| ```submit<T>(content: T): this``` |  | Set submit content | ```request.submit('123')``` |
| ```param(params: { [key: string]: any }): this``` |  | Add params | ```request.param({ method: XHRMethod.POST, headers: [new Header('X-Access-Token', '123')] })``` |
| ```tag(...tags: string[]): this``` |  | Add tags | ```request.tag('user_login', 'customized_something')``` |
| ```(static) findParam<T>(name: string): T | undefined``` |  | Find param | ```const method = request.findParam<string>('method')``` |
| ```(static) hasTag(tag: string | RegExp): boolean``` |  | Find tag | ```const isLogin = request.hasTag('user_login'))``` |
| ```send(): void``` |  | Send request to message service | ```request.send()``` |
| ```require<T>(): Observable<T>``` |  | Send request asynchronized | ```const data = await request.require<string>()``` |
| ```requireSync<T>(): T``` |  | Send request synchronized (Not all provider supports this method) | ```const data = request.requireSync<string>()``` |

It is recommend to use ```send()``` because only by using this way resource's response can be compatible with cross share.

For example, if we want to save data to ```localStorage``` using ```StorageProtocol``` with address ```/user/state/token``` and content ```'123'```, we also want to add a tag so that our receiver will know which response it is:

```typescript
resourceManager.registerProtocol(new StorageProtocol()); // Only need do once for one ResourceManager
resourceManager.request.to('storage:///user/state/token').submit<string>('123').send();
```

#### Resource Response<T>

In purpose to support the structured clone algorithm, sending via message service will only receiver response's metadata (includes request's metadata). Response message's mask and tag must configure in [Configuration](#Configuration) before decalre any response listener or send any request.

| Field name | Default value | Usage        | Example |
|-|:-|:-|-:|
| ```responseData: T \| undefined``` | ```undefined``` | Get or set response's data | ```const data = response.responseData``` |
| ```status: Response.ResponseStatus``` | ```Response.ResponseStatus.Preparing``` | Get response's status | ```const status = response.status``` |
| ```request: ReadOnly<ResourceRequest>``` | Given by constructor | Get original request | ```const request = response.request``` |
| ```metadata: Response.ResponseMetadata``` | Generate in each call | Get response's metadata | ```const metadata = response.metadata``` |
| ```to(status: Response.ResponseStatus): this``` | | Set response's status | ```response.to(Response.ResponseStatus.Succeed)``` |

Raw request is in ```request``` field, so response listeners can access raw request, use ```Addon``` or other parameters, address or else as filters to find target request.

#### Injector

```typescript
export type RequestInjector = (request: ResourceRequest, response: ResourceResponse<any>,
    responseData: any, timepoint: InjectorTimepoint) => any;
```

Injector is a function describes in which kind of timepoint should be actived and must return a value as new ```responseData``` to next injector or output. For example, an after sent injector could be:

```typescript
this.resourceManager.inject(Injector.InjectorTimepoint.AfterSent, (request, response, data: Observable<any>) => {
    console.log(`after sent: ${request.protocol}://${request.address}`);
    return data;
});
```

#### How to write resource protocol

All resource protocol must inherts abstract class ```ResourceProtocol```, call ```super()``` in constructor and provides all supported protocols (in string array) then override two functions:

```typescript
/**
 * Request resources
 * @param request Resource request
 */
public abstract request(request: ResourceRequest, injector?: (data: any, timepoint: InjectorTimepoint) => any): Observable<any>;
/**
 * Request resources synchronized (Not all provider should support this)
 * @param request Resource request
 */
public abstract requestSync(request: ResourceRequest, injector?: (data: any, timepoint: InjectorTimepoint) => any): any;
```

```InjectorTimepoint.BeforeSend``` and ```InjectorTimepoint.AfterSent``` should be called by provider itself. When face error, direct throw any error and resource manager will change response's status to failed automatically.

### Configuration

Remember to set  ```Configuration.resource.response.mask``` and ```Configuration.resource.response.tag``` before send and request via resource manaager or register any resource listener.

| Name | Default value | Usage |
|-|:-|:-|
| ```Configuration.resource.response.mask``` | ```1``` | Message mask of response |
| ```Configuration.resource.response.tag``` | ```'RESPONSE'``` | Message tag of response |
| ```Configuration.resource.storaghe.root``` | ```'dlcs'``` | Root object name for localStorage |
| ```Configuration.resource.remote.defaultServer``` | ```null``` | Default remote server address, must set before use ```remote``` protocol |
| ```Configuration.resource.remote.defaultResponseType``` | ```null``` | Default remote response type |
| ```Configuration.resource.remote.defaultContentType``` | ```null``` | Default remote content-type |
| ```Configuration.resource.remote.assetsDirectory``` | ```null``` | Assets url for require asset files, must set before use ```assets``` protocol |
| ```Configuration.base.listenerPriority``` | ```100``` | Priority for root message listener of each base component |
| ```Configuration.base.reflectorName``` | ```'$AutoRegisterMetadata'``` | Autowired function postfix |

### Base Structure

```typescript
import { BaseComponent, MessageListener, StateListener, ResourceListener } from '@dlcs/core';
```

Base structure provides ```BaseComponent```, which is an advanced component includes state management, message service intergration and decoration based listeners.

| Field name | Default value | Usage        | Example |
|-|:-|:-|-:|
| ```state: string``` | ```''``` | Get or set component's state | ```this.state = 'after_load'``` |
| ```onState: (from: RawRegularExpression, to: RawRegularExpression, handler: (from: string, to: string) => void): void``` | | Add state listener | ```this.onState('', /after_\\S+/g, (from, to) => console.log(to))``` |
| ```destroy(): void``` | | Destroy component's root listener | ```this.destroy()``` |
| ```onMessage: (target: Listener \| AdvancedTree<Listener>): AdvancedTree<Listener>``` | | Add message listener | ```this.onMessage(this.messageService.listener.....)``` |
| ```onResponse: (address: Nullable<RawRegularExpression> = null, addons: Nullable<{ key: Request.AddonType, value: RawRegularExpression }[]> = null, state: Nullable<RawRegularExpression> = null, handler: (data: Response.ResponseMetadata) => void, ...params: any[]): AdvancedTree<Listener>``` | | Add resource listener (only effect resource sent via message service) | ```this.onResponse(null, [{key: Request.AddonType.Tag, value: 'user_profile'}], null, (data) => console.log(data))``` |

Please ignore all functions, only remember ```state```. We create a runtime reflection injector to define all listeners with decorators. There are three kinds of decorators: ```MessageListener```, ```StateListener``` and ```ResourceListener```.

```typescript
export class TestComponent extends BaseComponent {
    public constructor(protected messageService: MessageService) {
        super(messageService);
    }

    @ResourceListener({ tags: ['user_profile'] })
    public onResponseListener(response: Response.ResponseMetadata): void {
        console.log(response.responseData);
    }

    @MessageListener({ mask: 0B0110, priority: 100, state: 'idle' })
    public onMessageListener(message: Message): void {
        console.log(message.value);
    }

    @StateListener({ from: '', to: 'idle' })
    public onStateListener(from: string, to: string): void {
        console.log(to);
    }
}
```
