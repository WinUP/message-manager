/**
 * Mod use to create thread
 */
export enum ThreadMode {
    /**
     * Use WebWorker
     */
    WebWorker,
    /**
     * Use `Promise`
     */
    Promise,
    /**
     * Use `setTimeout()`
     */
    SetTimeout
}

/**
 * Native thread
 */
export class Thread<T, U> {
    /**
     * Callback observable of data computed
     */
    public computed: ((success: boolean, data: U) => void) | undefined;

    /**
     * Get thread mode
     */
    public readonly mode: ThreadMode;

    private worker: Worker | Promise<void> | number;
    private _threadUrl: string | undefined;

    /**
     * Create a thread
     * @param handler Runner. Runner's code will be copied to an isolated worker context.
     * @param mode Thread working mode (automatically detected if not given)
     */
    public constructor(private handler: (data: T) => U, mode?: ThreadMode) {
        switch (mode) {
            case undefined:
            case null:
            case ThreadMode.WebWorker:
                if (typeof Worker !== 'undefined') {
                    const blob = new Blob(
                        [`onmessage=function(a){var h=${handler.toString()};postMessage(h(a.data))}`],
                        { type: 'application/javascript' });
                    this.worker = new Worker(this._threadUrl = URL.createObjectURL(blob));
                    this.worker.onmessage = (event: MessageEvent) => {
                        this.send(true, event.data);
                    };
                    this.worker.onerror = (event: ErrorEvent) => {
                        this.send(false, event.error);
                    };
                    this.mode = ThreadMode.WebWorker;
                    break;
                } else if (mode === ThreadMode.WebWorker) {
                    throw new TypeError('Cannot create thread: Runnign environment does not support Web worker');
                }
            // tslint:disable-next-line:no-switch-case-fall-through
            case ThreadMode.Promise:
                if (typeof Promise !== 'undefined') {
                    this.worker = new Promise(resolve => { resolve(); });
                    this.mode = ThreadMode.Promise;
                    break;
                } else if (mode === ThreadMode.Promise) {
                    throw new TypeError('Cannot create thread: Runnign environment does not support Promise');
                }
            // tslint:disable-next-line:no-switch-case-fall-through
            case ThreadMode.SetTimeout:
            default:
                this.mode = ThreadMode.SetTimeout;
                this.worker = -1;
                break;
        }
    }

    /**
     * Destroy thread
     * @return Is the thread stopped. Notice that `Promise` does not support stop and returned value will always
     * be false if thread is using `Promise`.
     */
    public stop(): boolean {
        if (this.worker instanceof Worker) {
            this.worker.terminate();
            this._threadUrl && URL.revokeObjectURL(this._threadUrl);
            this._threadUrl = undefined;
            return true;
        } else if (this.worker instanceof Promise) {
            return false;
        } else {
            clearTimeout(this.worker);
            return true;
        }
    }

    /**
     * Send a value to thread for compute
     * @param value Target value
     */
    public compute(value: T): void {
        if (typeof Worker !== 'undefined' && this.worker instanceof Worker) {
            this.worker.postMessage(value);
        } else if (typeof Promise !== 'undefined' && this.worker instanceof Promise) {
            this.worker = this.worker.then(() => {
                const data = this.handler(value);
                this.send(true, data);
            }).catch(error => {
                this.send(false, error);
            });
        } else {
            this.worker = setTimeout(() => {
                try {
                    const data = this.handler(value);
                    this.send(true, data);
                } catch (ex) {
                    this.send(false, ex);
                }
            });
        }
    }

    private send(success: boolean, data: any): void {
        this.computed?.(success, data);
    }
}
