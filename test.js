var {
    ListenerComponent,
    MessageService,
    StateListener,
    ReactAdjointListener
} = require('./dist');
var {
    Component
} = require('react');


class TestComponent extends ListenerComponent {
    constructor() {
        super({
            test1: 1,
            test2: [1, 2, 3],
            test3: {
                test31: 1,
                test32: {
                    test321: 1
                }
            }
        });
    }

    stateListener(old) {
        console.log(JSON.stringify(old));
    }
}

StateListener()(TestComponent.prototype, 'stateListener', null);

console.log('Test normal component');

let instance = new TestComponent();

instance.state.test1 = 2;
instance.beginCacheStateChanges();
instance.state.test2 = [2, 3, 4];
instance.state.test2[0] = 3;
instance.state.test3.test32 = {
    test322: 1
};
instance.state.test1 = 3;
instance.finishCacheStateChanges();
instance.state.test3.test32.test322 = 2;

class ReactTest extends Component {
    constructor() {
        super({});
        const state = {
            test1: 1,
            test2: [1, 2, 3],
            test3: {
                test31: 1,
                test32: {
                    test321: 1
                }
            }
        };
        this.state = state;
        this.listener = new ReactAdjointListener(this, state);
    }

    stateListener(old) {
        console.log(JSON.stringify(old));
    }
}

StateListener()(ReactTest.prototype, 'stateListener', null);

console.log('Test adjoint component in react');

instance = new ReactTest();

instance.listener.state.test1 = 2;
instance.listener.beginCacheStateChanges();
instance.listener.state.test2 = [2, 3, 4];
instance.listener.state.test2[0] = 3;
instance.listener.state.test3.test32 = {
    test322: 1
};
instance.listener.state.test1 = 3;
instance.listener.finishCacheStateChanges();
instance.listener.state.test3.test32.test322 = 2;

instance.setState({
    test1: 1
});