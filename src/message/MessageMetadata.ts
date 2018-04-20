/**
 * Message metadata
 */
export interface MessageMetadata {
    id: string;
    sync: boolean;
    lazy: boolean;
    mask: number;
    tag: string;
    value: any;
}
