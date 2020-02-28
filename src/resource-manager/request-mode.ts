/**
 * Request mode
 */
export enum RequestMode {
    /**
     * Send the response to `MessageService` with mask and tag configured in configuration,
     * which makes all listeners inside application can access the response data.
     */
    ViaMessageService,
    /**
     * Do synchronized request, may cause error if protocol doesn't support synchronized mode.
     */
    Synchronized,
    /**
     * Do asynchronized request
     */
    Asynchronized
}
