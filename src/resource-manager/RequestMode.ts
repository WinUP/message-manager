/**
 * Request mode
 */
export enum RequestMode {
    /**
     * Send the response to ```MessageService``` with mask and tag configured in ```Configuration```. By using
     * this mode, response's metadata can be shared to other instances if cross share in ```MessageService```
     * is active. Also it can be monitored by base component's resource listener.
     */
    ViaMessageService,

    /**
     * Do synchronized request, not all provider supports this.
     */
    Synchronized,

    /**
     * Do asynchronized request.
     */
    Asynchronized
}
