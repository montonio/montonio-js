import { EnvironmentOptions } from '../../services/Config/types';

/**
 * Montonio Checkout options
 */
export interface CheckoutOptions {
    /**
     * The UUID of the checkout session
     */
    sessionUuid: string;

    /**
     * Defaults to 'en_US' on the backend
     */
    locale?: LocaleEnum;

    /**
     * Environment to use
     * Defaults to 'production'
     */
    environment?: EnvironmentOptions;

    /**
     * Called when a payment completes successfully
     */
    onSuccess: (result: PaymentResult) => void;

    /**
     * Called when a payment fails or validation errors occur
     */
    onError: (error: Error) => void;

    /**
     * (Optional)
     * Called when the payment requires additional user action (e.g. 3DS, redirect)
     */
    onActionRequired?: (payload: ActionRequiredPayload) => void;
}

export type UpdatableCheckoutOptions = Pick<Partial<CheckoutOptions>, 'locale'>;

/**
 * Type of action required: e.g. authentication (3DS, OTP, etc.). Use to lock pay button or show overlay.
 */
export enum ActionRequiredTypeEnum {
    AUTHENTICATION = 'authentication',
}

export interface ActionRequiredPayload {
    type: ActionRequiredTypeEnum;
}

/**
 * Checkout session data returned from Stargate
 */
export interface GatewayUrlResponse {
    uuid: string;
    url: string;
}

/**
 * Payment result returned to the store after submitting a payment
 */
export interface PaymentResult {
    returnUrl: string;
    orderToken: string;
    paymentStatus: PaymentStatusEnum;
}

export interface ReturnUrlResponse {
    merchantReturnUrl: string;
    orderToken: string;
    paymentStatus: PaymentStatusEnum;
}

export enum LocaleEnum {
    EN = 'en',
    ET = 'et',
    LT = 'lt',
    LV = 'lv',
    PL = 'pl',
    RU = 'ru',
    FI = 'fi',
}

export enum PaymentStatusEnum {
    PENDING = 'PENDING',
    AUTHORIZED = 'AUTHORIZED',
    PAID = 'PAID',
    PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
    REFUNDED = 'REFUNDED',
    VOIDED = 'VOIDED',
    ABANDONED = 'ABANDONED',
}
