import { LocaleEnum } from '../../components/MontonioCheckout/types';

export interface MessageSubscription {
    id: string;
    messageType: MessageTypeEnum;
    handler: (message: MessageData) => void;
    sources: Window[];
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
    CHECKOUT_SEND_PAYMENT_FAILED_DATA = 'montonio:checkout.sendPaymentFailedData',
    CHECKOUT_HEIGHT_CHANGED = 'montonio:checkout.heightChanged',
}

export interface MessageData {
    name: MessageTypeEnum;
    payload?: unknown;
}

export interface CheckoutHeightChangedMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_HEIGHT_CHANGED;
    payload: {
        height: number;
    };
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

export interface PaymentAuthMessageData {
    type: 'redirect' | 'embedded';
    embeddedUrl?: string;
    redirectUrl?: string;
    redirectMethod?: string;
    formData?: Record<string, string>;
    originalPaymentMethodData?: unknown;
}

export interface CheckoutStartPaymentAuthMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_START_PAYMENT_AUTH;
    payload: {
        paymentAuthData: PaymentAuthMessageData;
    };
}

export interface CheckoutSendPaymentAuthDataMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_SEND_PAYMENT_AUTH_DATA;
    payload: {
        paymentAuthData: PaymentAuthMessageData;
    };
}

export interface CheckoutPaymentAuthComponentReadyMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_PAYMENT_AUTH_COMPONENT_READY;
}

export interface CheckoutPaymentAuthCompletedMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_PAYMENT_AUTH_COMPLETED;
}

export interface CheckoutPaymentCompletedMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_PAYMENT_COMPLETED;
    payload: {
        paymentIntentUuid: string;
        resultCode: string;
        returnUrl?: string;
    };
}

export interface PaymentFailedMessageData {
    errorCode: string;
    paymentIntentUuid?: string;
    originalPaymentMethodResult?: unknown;
}

export interface CheckoutPaymentFailedMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_PAYMENT_FAILED;
    payload: PaymentFailedMessageData;
}

export interface CheckoutSendPaymentFailedDataMessage extends MessageData {
    name: MessageTypeEnum.CHECKOUT_SEND_PAYMENT_FAILED_DATA;
    payload: PaymentFailedMessageData;
}
