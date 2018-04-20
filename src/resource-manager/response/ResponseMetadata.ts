import { RequestMetadata } from '../request/RequestMetadata';
import { ResponseStatus } from './ResponseStatus';

/**
 * Response metadata
 */
export interface ResponseMetadata<T = any> {
    /**
     * Raw request's metadata
     */
    request: Readonly<RequestMetadata>;
    /**
     * Status
     */
    status: ResponseStatus;
    /**
     * Response data
     */
    responseData: T;
}
