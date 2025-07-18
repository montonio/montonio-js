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
     * Callback when payment is completed successfully
     */
    // onPaymentSuccess?: (data: any) => void;

    /**
     * Callback when payment fails
     */
    // onPaymentError?: (error: any) => void;
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
    orderToken?: string;
    paymentStatus?: string;
}

export interface ReturnUrlResponse {
    merchantReturnUrl: string;
}

export enum LocaleEnum {
    EN_US = 'en_US',
    ET = 'et',
    LV = 'lv',
    LT = 'lt',
    PL = 'pl',
    FI = 'fi',
    RU = 'ru',
}
