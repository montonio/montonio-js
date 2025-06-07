import { Environment } from '../../services/Config/types';

/**
 * Montonio Checkout options
 */
export interface CheckoutOptions {
    /**
     * The UUID of the checkout session
     */
    sessionUuid: string;

    /**
     * The element to mount the checkout to
     * Can be a CSS selector or HTMLElement
     */
    mountTo: string | HTMLElement;

    /**
     * Environment to use
     * Defaults to 'production'
     */
    environment?: Environment;

    /**
     * Callback when payment is completed successfully
     */
    // onPaymentSuccess?: (data: any) => void;

    /**
     * Callback when payment fails
     */
    // onPaymentError?: (error: any) => void;
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
    paymentStatus: string;
    orderToken: string;
    returnUrl: string;
}
