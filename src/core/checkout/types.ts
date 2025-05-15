/**
 * Montonio Checkout options
 */
export interface CheckoutOptions {
    /**
     * The UUID of the checkout session
     */
    checkoutSessionUuid: string;

    /**
     * The element to mount the checkout to
     * Can be a CSS selector or HTMLElement
     */
    mountTo: string | HTMLElement;

    /**
     * Environment to use
     * Defaults to 'production'
     */
    environment?: 'production' | 'sandbox';

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
 * Checkout session data returned from the API
 */
export interface CheckoutSessionData {
    /**
     * The URL to load in the iframe
     */
    checkoutSessionUrl: string;
}
