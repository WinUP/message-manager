import { IRequestMetadata } from '../request/RequestMetadata';
import { ResponseStatus } from './ResponseStatus';

/**
 * Response metadata
 */
export interface IResponseMetadata<T = any> {
    /**
     * Raw request's metadata
     */
    request: Readonly<IRequestMetadata>;
    /**
     * Status
     */
    status: ResponseStatus;
    /**
     * Response data
     */
    responseData: T;
}
