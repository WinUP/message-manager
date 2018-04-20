import { RequestType } from './RequestType';

/**
 * Request metadata
 */
export interface RequestMetadata {
    /**
     * Protocol
     */
    protocol: string;
    /**
     * Address
     */
    address: string;
    /**
     * Tags
     */
    tags: Readonly<string[]>;
    /**
     * Parameters
     */
    params: Readonly<{ [key: string]: any }>;
    /**
     * Content (only available in submit mode)
     */
    content?: any;
    /**
     * Request type
     */
    type: RequestType;
}
