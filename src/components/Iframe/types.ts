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
    CHECKOUT_PAYMENT_COMPONENT_READY = 'montonio:checkout.paymentComponentReady',
    CHECKOUT_CHANGE_LOCALE = 'montonio:checkout.changeLocale',
    CHECKOUT_SUBMIT_PAYMENT = 'montonio:checkout.submitPayment',
    CHECKOUT_START_PAYMENT_AUTH = 'montonio:checkout.startPaymentAuth',
    CHECKOUT_SEND_PAYMENT_AUTH_DATA = 'montonio:checkout.sendPaymentAuthData',
    CHECKOUT_PAYMENT_AUTH_COMPONENT_READY = 'montonio:checkout.paymentAuthComponentReady',
    CHECKOUT_PAYMENT_AUTH_COMPLETED = 'montonio:checkout.paymentAuthCompleted',
    CHECKOUT_PAYMENT_COMPLETED = 'montonio:checkout.paymentCompleted',
    CHECKOUT_PAYMENT_FAILED = 'montonio:checkout.paymentFailed',
}

export interface MessageData<T = unknown> {
    name: MessageTypeEnum;
    payload?: T;
}

export interface CheckoutPaymentComponentReadyMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_PAYMENT_COMPONENT_READY;
}

export interface CheckoutChangeLocaleMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_CHANGE_LOCALE;
    payload: {
        locale: LocaleEnum;
    };
}

export interface CheckoutSubmitPaymentMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_SUBMIT_PAYMENT;
}

export interface CheckoutStartPaymentAuthMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_START_PAYMENT_AUTH;
    payload: {
        paymentAuthData: unknown;
        paymentAuthUrl: string;
    };
}

export interface CheckoutSendPaymentAuthDataMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_SEND_PAYMENT_AUTH_DATA;
    payload: unknown;
}

export interface CheckoutPaymentAuthComponentReadyMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_PAYMENT_AUTH_COMPONENT_READY;
}

export interface CheckoutPaymentAuthCompletedMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_PAYMENT_AUTH_COMPLETED;
}

export interface CheckoutPaymentCompletedMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_PAYMENT_COMPLETED;
}

export interface CheckoutPaymentFailedMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_PAYMENT_FAILED;
}
