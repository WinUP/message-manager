export const Configuration: Configuration = {
    resource: {
        response: { mask: 1, tag: 'RESPONSE' },
        storage: {
            root: 'dashcore'
        },
        remote: {
            defaultServer: null,
            defaultResponseType: null,
            defaultContentType: null,
            assetsDirectory: null
        }
    },
    base: {
        listenerPriority: 100,
        reflectorName: '$AutoRegisterMetadata'
    }
};

export interface Configuration {
    /**
     * Resource manager configuration
     */
    resource: {
        /**
         * Message of response
         */
        response: MessageBasedConfiguration;
        /**
         * Storage protocol provider configuration
         */
        storage: {
            /**
            * Root object name for localStorage
            */
            root: string;
        };
        /**
         * Remote protocol provider configuration
         */
        remote: {
            /**
             * Default remote server address
             */
            defaultServer: string | null;
            /**
             * Default remote response type
             */
            defaultResponseType: string | null;
            /**
             * Default remote content-type
             */
            defaultContentType: string | null;
            /**
             * Assets url for require asset files
             */
            assetsDirectory: string | null;
        };
    };
    /**
     * Base component configuration
     */
    base: {
        /**
         * Priority for root message listener of each base component
         */
        listenerPriority: number;
        /**
         * Autowired function postfix
         */
        reflectorName: string;
    };
}

/**
 * Configuration based on message
 */
export interface MessageBasedConfiguration {
    /**
     * Message mask
     */
    mask: number;
    /**
     * Message tag
     */
    tag: string;
}
