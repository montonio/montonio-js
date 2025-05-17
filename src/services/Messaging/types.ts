/**
 * Generic message payload type
 * Can be overridden with a more specific type when needed
 */
export type MessagePayload = unknown;

/**
 * Message handler function type
 */
export type MessageHandler = (data: MessagePayload) => void;

export interface MessageOptions {
    /**
     * Target origin for the postMessage
     * @default '*'
     */
    targetOrigin?: string;
}
