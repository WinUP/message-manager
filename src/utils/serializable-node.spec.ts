import { SerializableNode } from './serializable-node';

describe('SerializableNode', () => {
    it('should create and drop nodes successfully', () => {
        const root = new SerializableNode('root');
        root.set('/User/MainRecord/Username', 'Test');
        expect(root.create('/User/MainRecord/Username').value).toEqual('Test');
        root.drop('/User');
        expect(root.create('/User/MainRecord/Username').value).toBeUndefined();
    });

    it('should serialize and deserialize nodes successfully', () => {
        const root = new SerializableNode('root');
        root.set('/User/MainRecord/Username', 'Test');
        const newRoot = SerializableNode.deserialize(root.serialize());
        expect(newRoot.create('/User/MainRecord/Username').value).toEqual('Test');
    });
});
