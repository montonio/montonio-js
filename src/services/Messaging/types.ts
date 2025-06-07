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

export enum MessageTypeEnum {
    THREE_D_SECURE_COMPONENT_LOADED = 'three_d_secure_component_loaded',
    START_EMBEDDED_THREE_D_SECURE_PROCESS = 'start_three_d_secure_process ',
    END_EMBEDDED_THREE_D_SECURE_PROCESS = 'end_three_d_secure_process',
    SUBMIT_PAYMENT = 'submit_payment',
    START_REDIRECT_THREE_D_SECURE_PROCESS = 'start_redirect_three_d_secure_process',
}

export interface MessagePayload<T = unknown> {
    name: MessageTypeEnum;
    payload?: T;
}
