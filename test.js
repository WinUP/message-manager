var { ListenerComponent, MessageService, StateListener } = require('./dist');


class TestComponent extends ListenerComponent {
    constructor() {
        super({ test1: 1, test2: [1,2,3], test3: { test31: 1, test32: { test321: 1 } } });
    }

    stateListener(old) {
        console.log(JSON.stringify(old));
    }
}

StateListener()(TestComponent.prototype, 'stateListener', null);

const instance = new TestComponent();

instance.state.test1 = 2;
instance.beginCacheStateChanges();
instance.state.test2 = [2,3,4];
instance.state.test2[0] = 3;
instance.state.test3.test32 = { test322: 1 }
instance.state.test1 = 3;
instance.finishCacheStateChanges();
instance.state.test3.test32.test322 = 2;
