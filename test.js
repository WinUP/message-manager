var { BaseComponent, ResourceManager, MessageService, MemoryCache } = require('./dist');

const message = new MessageService();

class TestComponent extends BaseComponent {
    constructor() {
        super(message);
        this.onMessage(message.listener.for(1).listenAll().receiver(message => {
            console.log(message);
            return message;
        }));
    }
}

const test = new TestComponent();
const cache = new MemoryCache(message);

console.log(cache.has('test'));
cache.set('test', 'value');
console.log(cache.get('test'));

