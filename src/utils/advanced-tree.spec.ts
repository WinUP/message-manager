import { AdvancedTree } from './advanced-tree';

describe('AdvancedTree', () => {
    function createTree(path: string): AdvancedTree<number> {
        const cache: Map<number, AdvancedTree<number>> = new Map();
        path.split(' ').map(e => e.split('->').map(r => +r)).forEach(relation => {
            const [parent, child] = relation;
            const parentNode = cache.get(parent) ?? cache.set(parent, new AdvancedTree<number>(parent)).get(parent)!;
            const childNode = cache.get(child) ?? cache.set(child, new AdvancedTree<number>(child)).get(child)!;
            childNode.parent = parentNode;
        });
        return cache.get(0)!;
    }
    it('should create successfully', () => {
        const root = createTree('0->1 0->2 1->3 1->4 3->5');
        expect(root).toBeTruthy();
        expect(root.content).toEqual(0);
        expect(root.previous).toBeUndefined();
        expect(root.next).toBeUndefined();
        expect(root.parent).toBeUndefined();
        expect(root.children.length).toEqual(2);

        expect(root.children[0].content).toEqual(2);
        expect(root.children[0].previous).toBeUndefined();
        expect(root.children[0].next?.content).toEqual(1);
        expect(root.children[0].parent?.content).toEqual(0);
        expect(root.children[0].children.length).toEqual(0);

        expect(root.children[1].content).toEqual(1);
        expect(root.children[1].previous?.content).toEqual(2);
        expect(root.children[1].next).toBeUndefined();
        expect(root.children[1].parent?.content).toEqual(0);
        expect(root.children[1].children.length).toEqual(2);

        expect(root.children[1].children[0].content).toEqual(4);
        expect(root.children[1].children[0].previous).toBeUndefined();
        expect(root.children[1].children[0].next?.content).toEqual(3);
        expect(root.children[1].children[0].parent?.content).toEqual(1);
        expect(root.children[1].children[0].children.length).toEqual(0);

        expect(root.children[1].children[1].content).toEqual(3);
        expect(root.children[1].children[1].previous?.content).toEqual(4);
        expect(root.children[1].children[1].next).toBeUndefined();
        expect(root.children[1].children[1].parent?.content).toEqual(1);
        expect(root.children[1].children[1].children.length).toEqual(1);

        expect(root.children[1].children[1].children[0].content).toEqual(5);
        expect(root.children[1].children[1].children[0].previous).toBeUndefined();
        expect(root.children[1].children[1].children[0].next).toBeUndefined();
        expect(root.children[1].children[1].children[0].parent?.content).toEqual(3);
        expect(root.children[1].children[1].children[0].children.length).toEqual(0);
    });

    it('should find correct node', () => {
        const root = createTree('0->1 0->2 1->3 1->4 3->5');
        expect(root.find(node => node.content === 4)?.content).toEqual(4);
    });

    it('should find nothing if node was disabled', () => {
        const root = createTree('0->1 0->2 1->3 1->4 3->5');
        const child = root.find(node => node.content === 3);
        expect(child).toBeTruthy();
        child && (child.enabled = false);
        expect(root.find(node => node.content === 5)?.content).toBeUndefined();
    });

    it('should return corrrect answer of every condition', () => {
        const root = createTree('0->1 0->2 1->3 1->4 3->5');
        expect(root.every(node => node.content != null && node.content > -1)).toBeTrue();
        expect(root.every(node => node.content != null && node.content > 0)).toBeFalse();
    });

    it('should return corrrect answer of some condition', () => {
        const root = createTree('0->1 0->2 1->3 1->4 3->5');
        expect(root.some(node => node.content != null && node.content > 3)).toBeTrue();
        expect(root.some(node => node.content != null && node.content > 6)).toBeFalse();
    });

    it('should destroy correctly', () => {
        const root = createTree('0->1 0->2 1->3 1->4 3->5');
        const [node1, node2, node3, node4, node5] = [
            root.children[1],
            root.children[0],
            root.children[1].children[1],
            root.children[1].children[0],
            root.children[1].children[1].children[0]
        ];
        root.destroy();
        expect(root.parent).toBeUndefined();
        expect(root.previous).toBeUndefined();
        expect(root.next).toBeUndefined();
        expect(root.children.length).toEqual(0);

        expect(node1.parent).toBeUndefined();
        expect(node1.previous).toBeUndefined();
        expect(node1.next).toBeUndefined();
        expect(node1.children.length).toEqual(0);

        expect(node2.parent).toBeUndefined();
        expect(node2.previous).toBeUndefined();
        expect(node2.next).toBeUndefined();
        expect(node2.children.length).toEqual(0);

        expect(node3.parent).toBeUndefined();
        expect(node3.previous).toBeUndefined();
        expect(node3.next).toBeUndefined();
        expect(node3.children.length).toEqual(0);

        expect(node4.parent).toBeUndefined();
        expect(node4.previous).toBeUndefined();
        expect(node4.next).toBeUndefined();
        expect(node4.children.length).toEqual(0);

        expect(node5.parent).toBeUndefined();
        expect(node5.previous).toBeUndefined();
        expect(node5.next).toBeUndefined();
        expect(node5.children.length).toEqual(0);
    });
});
