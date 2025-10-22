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
    onSuccess?: (result: PaymentResult) => void;

    /**
     * Called when a payment fails or validation errors occur
     */
    onError?: (error: Error) => void;
}

export type UpdatableCheckoutOptions = Pick<Partial<CheckoutOptions>, 'locale'>;

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
