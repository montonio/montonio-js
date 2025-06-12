import { LocaleEnum } from '../MontonioCheckout/types';

export interface IframeOptions {
    /**
     * URL to load in the iframe
     */
    src: string;

    /**
     * Query parameters to add to the iframe URL
     */
    queryParams?: Record<string, string>;

    /**
     * Element to mount the iframe to
     */
    mountElement: HTMLElement;

    /**
     * Optional allow attribute for iframe permissions
     * @default 'payment'
     */
    allow?: string;

    /**
     * Optional iframe styles as CSS properties
     */
    styles?: Partial<CSSStyleDeclaration>;
}

export interface MessageOptions {
    targetOrigin?: string;
}

export enum MessageTypeEnum {
    CHECKOUT_IFRAME_READY = 'montonio:checkout.iframeReady',
    ADYEN_EMBEDDED_IFRAME_READY = 'payment_component_loaded', // TODO: change later to montonio:checkout.adyenEmbeddedIframeReady
    CHECKOUT_SUBMIT_PAYMENT = 'montonio:checkout.submitPayment',
    CHECKOUT_CHANGE_LOCALE = 'montonio:checkout.changeLocale',
    THREE_D_SECURE_COMPONENT_LOADED = 'three_d_secure_component_loaded',
    START_EMBEDDED_THREE_D_SECURE_PROCESS = 'start_three_d_secure_process ',
    END_EMBEDDED_THREE_D_SECURE_PROCESS = 'end_three_d_secure_process',
    START_REDIRECT_THREE_D_SECURE_PROCESS = 'start_redirect_three_d_secure_process',
    SUBMIT_PAYMENT = 'submit_payment',
}

export interface MessageData<T = unknown> {
    name: MessageTypeEnum;
    payload?: T;
}

export interface CheckoutIframeReadyMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_IFRAME_READY;
}

export interface AdyenEmbeddedIframeReadyMessage extends MessageData {
    name: MessageTypeEnum.ADYEN_EMBEDDED_IFRAME_READY;
}

export interface CheckoutSubmitPaymentMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_SUBMIT_PAYMENT;
}

export interface CheckoutChangeLocaleMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_CHANGE_LOCALE;
    payload: {
        locale: LocaleEnum;
    };
}
