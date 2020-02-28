export interface ISerializableNode {
    _$k?: string;
    _$v: any;
    [key: string]: any;
}

/**
 * Node with build-in serializable support
 */
export class SerializableNode {
    /**
     * Deserialize ```ISerializableNode``` to ```SerializableNode```
     * @param source Source data
     */
    public static deserialize(source: ISerializableNode): SerializableNode {
        const root = new SerializableNode(source._$k!, source._$v);
        Object.keys(source).forEach(key => {
            if (key === '_$k' || key === '_$v') { return; }
            const item: ISerializableNode = source[key];
            item._$k = item._$k || key;
            root._children.push(SerializableNode.deserialize(item));
        });
        return root;
    }

    private static _dropNode(root: SerializableNode, node: SerializableNode): void {
        if (root._children.indexOf(node) > -1) {
            root._children.splice(root._children.indexOf(node), 1);
        } else {
            root._children.forEach(parent => {
                SerializableNode._dropNode(parent, node);
            });
        }
    }

    private static _dropByAddress(root: SerializableNode, address: string): void {
        if (address === '/') {
            root._children = [];
            root.value = undefined;
            return;
        }
        const hierarchy = address.split('/').slice(1);
        let pointer: SerializableNode = root;
        let parent: SerializableNode = pointer;
        for (let i = 0; i < hierarchy.length; i++) {
            const child = pointer._children.find(v => v.key === hierarchy[i]);
            if (child && i === hierarchy.length - 1) {
                parent._children.splice(parent._children.indexOf(child), 1);
                return;
            } else if (child) {
                parent = pointer;
                pointer = child;
            } else {
                return;
            }
        }
    }

    private static _address(root: SerializableNode, node: SerializableNode, prefix: string): string | undefined {
        if (root.children.indexOf(node) > -1) {
            return `${prefix}/${node.key}`;
        } else if (root.children.length === 0) {
            return undefined;
        } else {
            for (let i = 0; i < root.children.length; i++) {
                const child = root.children[i];
                const result = SerializableNode._address(child, node, `${prefix}/${child.key}`);
                if (result) { return result; }
            }
            return undefined;
        }
    }

    private static _serialize(root: SerializableNode, noKey: boolean = false): ISerializableNode {
        const result: ISerializableNode = { _$v: root.value };
        if (!noKey) { result._$k = root.key; }
        root._children.forEach(child => {
            result[child.key] = SerializableNode._serialize(child, true);
        });
        return result;
    }

    /**
     * Get node's key
     */
    public get key(): string {
        return this._key;
    }

    /**
     * Get node's children
     */
    public get children(): ReadonlyArray<SerializableNode> {
        return this._children;
    }

    public value?: any;
    private _key: string;
    private _children: SerializableNode[] = [];

    /**
     * Create new node
     * @param key Node's key
     * @param value Node's initial value
     */
    public constructor(key: string, value?: any) {
        this._key = key;
        this.value = value;
    }

    /**
     * Set node's value starts from root node and search by address
     * @param address Target node's address
     * @param value New value
     * @description Another way is use SerializableNode.find() to find the node and set value manually.
     * Nodes throw address will be created automatically.
     */
    public set(address: string, value: any): SerializableNode {
        const node = this.create(address);
        node.value = value;
        return node;
    }

    /**
     * Get node's value starts from root node and search by address
     * @param address Target node's address
     * @description Another way is use SerializableNode.find() to find the node and read value manually.
     * Nodes throw address will be created automatically.
     */
    public get<U = any>(address: string): U {
        return this.create(address).value;
    }

    /**
     * Drop node and all its children from root's node tree if that node is root's directly or indirectly child.
     * @param node Target node or node's address. Should be different than root
     * @description If you want to drop node's data, just set its value to undefined.
     */
    public drop(node: SerializableNode | string): void {
        if (typeof node === 'string') {
            SerializableNode._dropByAddress(this, node);
        } else {
            if (this === node) { return; }
            SerializableNode._dropNode(this, node);
        }
    }

    /**
     * Find node's address starts from current node. If given node it not child or
     * relative child of this node, function will return `undefined`.
     * @param node Target node
     */
    public address(node: SerializableNode): string | undefined {
        return this === node ? '/' : SerializableNode._address(this, node, '');
    }

    /**
     * Find node using address starts from given root, it will create all nodes passed by the address
     * @param root Root node
     * @param address Target address
     */
    public create(address: string): SerializableNode {
        if (address === '/') { return this; }
        const hierarchy = address.split('/').slice(1);
        let pointer: SerializableNode = this;
        hierarchy.forEach(itemKey => {
            if (itemKey === '_$k' || itemKey === '_$v') {
                throw new TypeError(`Node's key cannot be _$k or _$v, they are keywords of SerializableNode`);
            }
            let child = pointer._children.find(v => v.key === itemKey);
            if (!child) {
                child = new SerializableNode(itemKey, undefined);
                pointer._children.push(child);
            }
            pointer = child;
        });
        return pointer;
    }

    /**
     * Serialize this node to ```ISerializableNode```
     */
    public serialize(): ISerializableNode {
        return SerializableNode._serialize(this);
    }
}
