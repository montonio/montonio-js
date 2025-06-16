export interface PaymentAuthOptions {
    paymentAuthUrl: string;
    paymentAuthData: unknown; // TODO: This should be standardized and not Adyen specific
    mountElement?: HTMLElement;
}
