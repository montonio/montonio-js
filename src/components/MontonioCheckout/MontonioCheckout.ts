import {
    CheckoutOptions,
    GatewayUrlResponse,
    PaymentResult,
    ReturnUrlResponse,
    UpdatableCheckoutOptions,
} from './types';
import { Iframe } from '../Iframe/Iframe';
import { PaymentAuth } from '../PaymentAuth/PaymentAuth';
import { BaseComponent } from '../BaseComponent';
import { getElement } from '../../utils';
import { Environment, EnvironmentOptions } from '../../services/Config/types';
import { MessageTypeEnum } from '../../services/Messaging';
import {
    FailedToFetchReturnUrlError,
    MontonioCheckoutNotInitializedError,
    PaymentFailedError,
    ValidationError,
} from '../../common';

export class MontonioCheckout extends BaseComponent {
    public isValid: boolean = false;

    private options: CheckoutOptions;
    private readonly environment: EnvironmentOptions;
    private paymentAuth: PaymentAuth | null = null;

    constructor(options: CheckoutOptions) {
        super();
        this.options = options;
        this.environment = options.environment || Environment.PRODUCTION;
    }

    /**
     * Mount the checkout to the DOM
     * @param mountTo - The element to mount the checkout to. Can be a CSS selector or an HTMLElement.
     */
    public async initialize(mountTo: string | HTMLElement): Promise<boolean> {
        try {
            this.mountElement = getElement(mountTo);

            const sessionData = await this.fetchSession();
            this.iframe = new Iframe({
                src: sessionData.url,
                mountElement: this.mountElement,
            });
            this.iframe.mount();

            await this.messagingService.waitForMessage(MessageTypeEnum.CHECKOUT_PAYMENT_COMPONENT_READY, this.iframe);

            this.listenForPaymentFormChanges();

            this.loaded = true;

            return true;
        } catch (error) {
            console.error('Error initializing MontonioCheckout', error);
            this.cleanup();
            throw error;
        }
    }

    /**
     * Update the options of the MontonioCheckout instance
     * @param options - Updatable options
     */
    public updateOptions(options: UpdatableCheckoutOptions): void {
        if (!this.loaded) {
            throw new MontonioCheckoutNotInitializedError();
        }

        if (options.locale !== undefined) {
            this.options.locale = options.locale;

            this.messagingService.postMessage(this.iframe, {
                name: MessageTypeEnum.CHECKOUT_CHANGE_LOCALE,
                payload: { locale: options.locale },
            });
        }
    }

    /**
     * Check the validity of the payment form. Throws an error if the payment form is invalid.
     */
    public async validateOrReject(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.messagingService
                .waitForMessage(MessageTypeEnum.CHECKOUT_VALIDATE_FIELDS_RESULT, this.iframe)
                .then((res) => {
                    if (res.payload.isValid) {
                        resolve();
                    } else {
                        reject(new ValidationError());
                    }
                })
                .catch(() => reject(new ValidationError()));

            this.messagingService.postMessage(this.iframe, {
                name: MessageTypeEnum.CHECKOUT_VALIDATE_FIELDS,
            });
        });
    }

    /**
     * Submit the payment. Call this after creating the Order with the Montonio backend API
     * @returns Promise that resolves to a PaymentResult
     */
    public async submitPayment(): Promise<PaymentResult> {
        if (!this.loaded) {
            throw new MontonioCheckoutNotInitializedError();
        }

        return new Promise((resolve, reject) => {
            // Handler for payment completion
            this.messagingService.subscribe(
                MessageTypeEnum.CHECKOUT_PAYMENT_COMPLETED,
                async (completedMessage) => {
                    console.log('CHECKOUT_PAYMENT_COMPLETED (from main iframe)', completedMessage);

                    this.cleanupPaymentAuth();

                    try {
                        const result = await this.getPaymentResult(completedMessage.payload.paymentIntentUuid);
                        // Resolve the promise to the SDK user
                        resolve(result);
                    } catch (e) {
                        reject(e);
                    }

                    this.cleanupAfterPaymentSubmission();
                },
                this.iframe,
            );

            // Handler for payment failure
            this.messagingService.subscribe(
                MessageTypeEnum.CHECKOUT_PAYMENT_FAILED,
                (failedMessage) => {
                    console.error('CHECKOUT_PAYMENT_FAILED (from main iframe)', failedMessage);

                    this.cleanupPaymentAuth();

                    // Send error message to the main iframe to be displayed above the payment form
                    this.messagingService.postMessage(this.iframe, {
                        name: MessageTypeEnum.CHECKOUT_SEND_PAYMENT_FAILED_DATA,
                        payload: failedMessage.payload,
                    });

                    // Reject the promise to the SDK user
                    reject(new PaymentFailedError(failedMessage.payload));
                    this.cleanupAfterPaymentSubmission();
                },
                this.iframe,
            );

            // Handler for validation errors
            this.messagingService.subscribe(
                MessageTypeEnum.CHECKOUT_VALIDATE_FIELDS_RESULT,
                (res) => {
                    console.log('CHECKOUT_VALIDATE_FIELDS_RESULT', res);
                    if (!res.payload.isValid) {
                        reject(new ValidationError());
                    }
                },
                this.iframe,
            );

            // Handler for Payment Auth (3DS) in case it is requested by the main iframe
            this.messagingService.subscribe(
                MessageTypeEnum.CHECKOUT_START_PAYMENT_AUTH,
                async (message) => {
                    try {
                        console.log('PAYMENT AUTH STARTED', message);

                        this.paymentAuth = new PaymentAuth({
                            paymentAuthData: message.payload.paymentAuthData,
                        });

                        await this.paymentAuth.initialize();

                        // Add the PaymentAuth iframe to existing subscriptions
                        // to get completion/failure messages also from PaymentAuth iframe
                        const paymentAuthIframe = this.paymentAuth.iframe;
                        this.messagingService.addIframeToSubscription(
                            MessageTypeEnum.CHECKOUT_PAYMENT_COMPLETED,
                            paymentAuthIframe,
                        );
                        this.messagingService.addIframeToSubscription(
                            MessageTypeEnum.CHECKOUT_PAYMENT_FAILED,
                            paymentAuthIframe,
                        );
                    } catch (error) {
                        // This error shouldn't happen in normal payment failures, only if the payment auth iframe initialization fails
                        // Still, we need to reject the promise to the SDK user
                        reject(error);
                    }
                },
                this.iframe,
            );

            // Submit the payment
            this.messagingService.postMessage(this.iframe, {
                name: MessageTypeEnum.CHECKOUT_SUBMIT_PAYMENT,
            });
        });
    }

    private async fetchSession(): Promise<GatewayUrlResponse> {
        const baseUrl = this.configService.getConfig('stargateUrl', this.environment);

        const url = `${baseUrl}/api/sessions/${this.options.sessionUuid}/gateway-url${
            this.options.locale ? `?preferredLocale=${this.options.locale}` : ''
        }`;

        return await this.httpService.get<GatewayUrlResponse>(url);
    }

    /**
     * Listen for changes in the payment form and update the isValid property
     */
    private listenForPaymentFormChanges(): void {
        this.messagingService.subscribe(
            MessageTypeEnum.CHECKOUT_PAYMENT_FORM_CHANGED,
            (message) => {
                this.isValid = message.payload.isValid;
                console.log('CHECKOUT_PAYMENT_FORM_CHANGED', this.isValid);
            },
            this.iframe,
        );
    }

    /**
     * After a payment has completed, fetch the return URL. Keep fetching until we
     * exhaust all the attempts
     */
    private async getPaymentResult(paymentIntentUuid: string): Promise<PaymentResult> {
        const baseUrl = this.configService.getConfig('stargateUrl', this.environment);
        const url = `${baseUrl}/api/payment-intents/${paymentIntentUuid}/return-url`;
        const MAX_ATTEMPTS = 10;
        const DELAY_BETWEEN_ATTEMPTS_IN_MS = 1000;
        let attempts = 0;

        while (attempts < MAX_ATTEMPTS) {
            try {
                const result = await this.httpService.get<ReturnUrlResponse>(url);
                attempts++;
                if (result?.merchantReturnUrl) {
                    return {
                        returnUrl: result.merchantReturnUrl,
                        orderToken: result.orderToken,
                        paymentStatus: result.paymentStatus,
                    };
                }
            } catch (error) {
                console.error('Error fetching return URL:', error);
            }

            // Wait for 1 second before the next attempt
            if (attempts < MAX_ATTEMPTS) {
                await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_ATTEMPTS_IN_MS));
            }
        }

        throw new FailedToFetchReturnUrlError({ attempts });
    }

    private cleanupAfterPaymentSubmission(): void {
        this.messagingService.clearSubscriptionsExcept([MessageTypeEnum.CHECKOUT_PAYMENT_FORM_CHANGED]);
    }

    private cleanupPaymentAuth(): void {
        if (this.paymentAuth) {
            this.paymentAuth.cleanup();
            this.paymentAuth = null;
        }
    }
}
