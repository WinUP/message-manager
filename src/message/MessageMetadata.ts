/**
 * Message metadata
 */
export interface IMessageMetadata {
    id: string;
    sync: boolean;
    lazy: boolean;
    mask: number;
    tag: string;
    value: any;
    ignore: boolean;
}
