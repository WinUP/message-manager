import { CancelToken } from './cancel-token';

/**
 * Node of tree with weight values
 */
export class AdvancedTree<T> {
    /**
     * Get or set parent
     */
    public get parent(): AdvancedTree<T> | undefined {
        return this._parent;
    } public set parent(value: AdvancedTree<T> | undefined) {
        this.setParent(value);
    }

    /**
     * Get or set weight value
     * @description If more than one nodes have same value, they will follow LIFO
     */
    public get priority(): number {
        return this._priority;
    } public set priority(value: number) {
        this.setPriority(value);
    }

    /**
     * Get next node of same level
     */
    public get next(): AdvancedTree<T> | undefined {
        return this._next;
    }

    /**
     * Get previous node of same level
     */
    public get previous(): AdvancedTree<T> | undefined {
        return this._previous;
    }

    /**
     * Get children list
     */
    public get children(): ReadonlyArray<AdvancedTree<T>> {
        return this._children;
    }

    /**
     * Get ID
     */
    public get id(): string | undefined {
        return this._id;
    }

    /**
     * Get or set enabled
     */
    public enabled: boolean = true;

    /**
     * Get or set content
     */
    public content: T | undefined;

    private _id?: string;
    private _priority: number = 0;
    private _next: AdvancedTree<T> | undefined;
    private _previous: AdvancedTree<T> | undefined;
    private _parent: AdvancedTree<T> | undefined;
    private _children: AdvancedTree<T>[] = [];

    public constructor(content?: T, id?: string) {
        this.content = content;
        this._id = id;
    }

    /**
     * Delete this node with all its children
     */
    public destroy(): void {
        while (this._children.length > 0) {
            this._children[0].destroy();
        }
        this.setParent(undefined);
    }

    /**
     * Determines whether the specified callback function returns true for any element of the tree
     * @param callbackfn A function that accepts only one argument. The some method calls
     * the callbackfn function for each element in the tree until the callbackfn returns a value
     * which is coercible to the Boolean value true, or until the end of the tree.
     */
    public some(callbackfn: (node: AdvancedTree<T>) => boolean): boolean {
        return this.reduce<boolean>((node, result, token) => {
            if (callbackfn(node)) {
                token.cancel();
                return true;
            }
            return result;
        }, false);
    }

    /**
     * Determines whether all the members of the tree satisfy the specified test
     * @param callbackfn A function that accepts only one argument. The every method calls
     * the callbackfn function for each element in the tree until the callbackfn returns a value
     * which is coercible to the Boolean value false, or until the end of the tree.
     */
    public every(callbackfn: (node: AdvancedTree<T>) => boolean): boolean {
        return this.reduce<boolean>((node, result, token) => {
            if (!callbackfn(node)) {
                token.cancel();
                return false;
            }
            return result;
        }, true);
    }

    /**
     * Returns the value of the first element in the tree where predicate is true, and undefined otherwise.
     * @param predicate find calls predicate once for each element of the tree until it finds one where
     * predicate returns true. If such an element is found, find immediately returns that element value.
     * Otherwise, find returns undefined.
     */
    public find(predicate: (node: AdvancedTree<T>) => boolean): AdvancedTree<T> | undefined;
    /**
     * Returns the value of the first element in the tree where predicate is true, and undefined otherwise.
     * @param predicate find calls predicate once for each element of the tree until it finds one where
     * predicate returns true. If such an element is found, find immediately returns that element value.
     * Otherwise, find returns undefined.
     */
    public find<S extends T = T>(predicate: (node: AdvancedTree<T>) => node is AdvancedTree<S>): AdvancedTree<S> | undefined;
    public find<S extends T = T>(predicate: (node: AdvancedTree<T>) => node is AdvancedTree<S>): AdvancedTree<S> | undefined {
        return this.reduce<AdvancedTree<S> | undefined>((node, result, token) => {
            if (predicate(node)) {
                token.cancel();
                return node;
            }
            return result;
        }, undefined);
    }

    /**
     * Returns all values in the tree where predicate is true, and empty array otherwise.
     * @param predicate findAll calls predicate once for each element of the tree and put all elements that
     * predicate returns true to an array. After checked all elements findAll will return that array.
     * If no element can pass the predicate, findAll returns empty array.
     */
    public findAll(predicate: (node: AdvancedTree<T>) => boolean): AdvancedTree<T>[];
    /**
     * Returns all values in the tree where predicate is true, and empty array otherwise.
     * @param predicate findAll calls predicate once for each element of the tree and put all elements that
     * predicate returns true to an array. After checked all elements findAll will return that array.
     * If no element can pass the predicate, findAll returns empty array.
     */
    public findAll<S extends T = T>(predicate: (node: AdvancedTree<T>) => node is AdvancedTree<S>): AdvancedTree<S>[];
    public findAll<S extends T = T>(predicate: (node: AdvancedTree<T>) => node is AdvancedTree<S>): AdvancedTree<S>[] {
        return this.reduce<AdvancedTree<S>[]>((node, result) => {
            predicate(node) && result.push(node);
            return result;
        }, []);
    }

    /**
     * Performs the specified action for each element in the tree
     * @param callbackfn A function that accepts up to two arguments. forEach calls the callbackfn function one time for each element in the tree.
     */
    public forEach(callbackfn: (node: AdvancedTree<T>, token: CancelToken) => void): void {
        this.reduce<void>((node, _result, token) => callbackfn(node, token), undefined);
    }

    /**
     * Calls the specified callback function for all the elements in the tree.
     * The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.
     * @param callbackfn A function that accepts up to three arguments. The reduce method calls the callbackfn function one time for each element in the tree.
     * @param initialData InitialValue is used as the initial value to start the accumulation.
     * The first call to the callbackfn function provides this value as an argument instead of an array value.
     */
    public reduce<U>(callbackfn: (node: AdvancedTree<T>, result: U, token: CancelToken) => U, initialData: U): U {
        let result: U = initialData;
        const walkStack: Array<AdvancedTree<T>> = new Array<AdvancedTree<T>>();
        let listPointer: AdvancedTree<T> = this; // 将指针指向当前节点
        walkStack.push(listPointer); // 放入当前节点
        const feedback: CancelToken = new CancelToken(); // 声明强制中断变量
        while (walkStack.length > 0) { // 只要栈内有值便继续处理
            result = callbackfn(listPointer, result, feedback); // 处理指针指向的节点
            if (feedback.cancelled) return result; // 如果处理函数要求强制中断，则立即中断遍历
            // 以下部分均是为了找到下一个需要处理的节点
            if (listPointer._children.length > 0) { // 优先处理节点的子节点
                walkStack.push(listPointer); // 放入当前节点
                listPointer = listPointer._children[0]; // 从第一个节点开始处理
                while (!listPointer.enabled) { // 跳过所有无效节点
                    while (!listPointer.next) { // 如果当前节点组已经处理完，则返回父节点所在的节点组
                        while (walkStack.length > 0) {
                            // tslint:disable-next-line:no-non-null-assertion
                            listPointer = walkStack.pop()!;
                            if (!listPointer.next) continue; // 循环直到找到有下一个兄弟节点的节点
                            break; // 一旦找到，直接跳出循环
                        }
                        if (walkStack.length === 0) return result; // 如果已经向上回溯到根节点则直接返回结果
                    }
                    listPointer = listPointer.next; // 移动到下一个节点
                }
                continue; // 命中有效节点时进入下一次主循环，准备处理目标节点
            }
            if (listPointer.next) { // 没有子节点时，处理下一个兄弟节点
                listPointer = listPointer.next; // 处理指针指向兄弟节点
                while (!listPointer.enabled) { // 跳过所有无效的兄弟节点
                    if (!listPointer.next) break; // 扫描到最后一个节点且该节点仍然无效（由循环定义）时跳出循环
                    listPointer = listPointer.next;
                }
                if (listPointer.enabled) continue; // 只要该节点有效，那么进入下一次主循环，准备处理目标节点
            }
            while (walkStack.length > 0) { // 没有下一个兄弟节点时，返回父节点
                // tslint:disable-next-line:no-non-null-assertion
                listPointer = walkStack.pop()!; // 处理指针指向父节点
                if (!listPointer.next) continue; // 如果该节点是节点组的最后一个，继续返回上一层
                while (listPointer.next) { // 处理该节点的下一个兄弟节点
                    listPointer = listPointer.next; // 处理指针指向兄弟节点
                    if (listPointer.enabled) break; // 一旦定位到有效节点，立即跳出循环
                }
                if (listPointer.enabled) break; // 只要该节点可用，进入下一次主循环，准备处理目标节点
            }
            if (walkStack.length === 0) return result; // 如果已经向上回溯到根节点则直接返回结果
        }
        return result; // 返回最终结果
    }

    /**
     * Print struccture starts from this node
     * @param indent Initial indent
     */
    public print(indent: number = 0): void {
        let title: string = '';
        title += this._children.length > 0 ? '- ' : '  ';
        title += `${this._id ?? '<anonymous>'} enabled: ${this.enabled}, priority: ${this._priority}, children: ${this._children.length}`;
        for (let i = 0; i < indent; i++) {
            title = ` ${title}`;
        }
        console.log(title);
        this._children.forEach(e => e.print(indent + 2));
    }

    private setPriority(value: number): void {
        this._priority = value;
        if (this._parent != null) {
            this.setParent(this.parent);
        }
    }

    private setParent(parent?: AdvancedTree<T>): void {
        if (this._parent != null) {
            const index = this._parent._children.findIndex(v => v === this);
            this._parent._children.splice(index, 1);
            if (this._previous) {
                this._previous._next = this._next;
            }
            if (this._next) {
                this._next._previous = this._previous;
            }
            this._next = undefined;
            this._previous = undefined;
        }
        this._parent = parent;
        if (this._parent == null) {
        } else if (this._parent._children.length === 0) {
            this._parent._children.push(this);
        } else {
            for (let i = 0; i < this._parent._children.length; i++) {
                if (this._priority >= this._parent._children[i]._priority) {
                    this._parent._children.splice(i, 0, this);
                    this._next = this._parent._children[i + 1];
                    this._previous = this._parent._children[i - 1];
                    break;
                }
                if (i === this._parent._children.length - 1) {
                    this._parent._children.push(this);
                    this._next = undefined;
                    this._previous = this._parent._children[i];
                    break;
                }
            }
            if (this._next === undefined) {
                this._next = undefined;
            }
            if (this._previous === undefined) {
                this._previous = undefined;
            }
            if (this._next) {
                this._next._previous = this;
            }
            if (this._previous) {
                this._previous._next = this;
            }
        }
    }
}
