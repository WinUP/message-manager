import { ShareMode } from './share-mode';

/**
 * Message metadata
 */
export interface IMessageMetadata {
    id: string;
    sync: boolean;
    mask: number;
    tag: string;
    value: any;
    mode: ShareMode;
}
