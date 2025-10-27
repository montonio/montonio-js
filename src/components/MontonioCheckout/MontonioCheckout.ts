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
import { LoggingService } from '../../services';

export class MontonioCheckout extends BaseComponent {
    public isValid: boolean = false;

    private options: CheckoutOptions;
    private readonly environment: EnvironmentOptions;
    private paymentAuth: PaymentAuth | null = null;

    constructor(options: CheckoutOptions) {
        super();
        this.options = options;
        this.environment = options.environment || Environment.PRODUCTION;

        LoggingService.instance.initialize(this.environment, this.options.sessionUuid);

        console.log('MONTONIO-JS: MontonioCheckout: class created with options:', options);
    }

    /**
     * Mount the checkout to the DOM
     * @param mountTo - The element to mount the checkout to. Can be a CSS selector or an HTMLElement.
     */
    public async initialize(mountTo: string | HTMLElement): Promise<boolean> {
        try {
            console.log('MONTONIO-JS: initialize: Initializing MontonioCheckout with mountTo:', mountTo);
            this.mountElement = getElement(mountTo);

            const sessionData = await this.fetchSession();
            this.iframe = new Iframe({
                src: sessionData.url,
                mountElement: this.mountElement,
            });
            this.iframe.mount();

            await this.messagingService.waitForMessage(MessageTypeEnum.CHECKOUT_PAYMENT_COMPONENT_READY, this.iframe);

            this.setUpListeners();

            this.loaded = true;

            console.log('MONTONIO-JS: initialize: MontonioCheckout initialized successfully');
            return true;
        } catch (error) {
            console.error('MONTONIO-JS: initialize: Error initializing MontonioCheckout:', error);
            this.cleanup();
            throw error;
        }
    }

    /**
     * Update the options of the MontonioCheckout instance
     * @param options - Updatable options
     */
    public updateOptions(options: UpdatableCheckoutOptions): void {
        console.log('MONTONIO-JS: updateOptions: Updating options to:', options);
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
    public validateOrReject(): void {
        console.log('MONTONIO-JS: validateOrReject: Called validateOrReject, isValid:', this.isValid);
        if (this.isValid) {
            return;
        }

        // Trigger validation in the iframe to show errors to the user
        this.messagingService.postMessage(this.iframe, {
            name: MessageTypeEnum.CHECKOUT_VALIDATE_FIELDS,
        });

        throw new ValidationError();
    }

    /**
     * Submit the payment. Call this after creating the Order with the Montonio backend API.
     * The result will be provided via the onSuccess callback, and errors via the onError callback.
     */
    public submitPayment(): void {
        if (!this.loaded) {
            throw new MontonioCheckoutNotInitializedError();
        }

        // Submit the payment - callbacks will be invoked when payment completes/fails
        this.messagingService.postMessage(this.iframe, {
            name: MessageTypeEnum.CHECKOUT_SUBMIT_PAYMENT,
        });
    }

    /**
     * Fetch the session data from the Stargate to get the gateway URL for the inner iframe
     */
    private async fetchSession(): Promise<GatewayUrlResponse> {
        const baseUrl = this.configService.getConfig('stargateUrl', this.environment);

        const url = `${baseUrl}/api/sessions/${this.options.sessionUuid}/gateway-url${
            this.options.locale ? `?preferredLocale=${this.options.locale}` : ''
        }`;

        console.log('MONTONIO-JS: fetchSession: Fetching iframe URL from:', url);
        return await this.httpService.get<GatewayUrlResponse>(url);
    }

    /**
     * Set up global listeners for payment completion, failure, payment auth, and validation.
     */
    private setUpListeners(): void {
        console.log('MONTONIO-JS: setUpListeners: Setting up listeners');
        this.setUpFormChangeListener();
        this.setUpPaymentCompletedListener();
        this.setUpPaymentFailedListener();
        this.setUpValidationListener();
        this.setUpPaymentAuthListener();
    }

    /**
     * Listen for payment form changes and update the isValid property
     */
    private setUpFormChangeListener(): void {
        this.messagingService.subscribe(
            MessageTypeEnum.CHECKOUT_PAYMENT_FORM_CHANGED,
            (message) => {
                this.isValid = message.payload.isValid;
            },
            this.iframe,
        );
    }

    /**
     * Listen for payment completion messages and handle the payment success
     */
    private setUpPaymentCompletedListener(): void {
        this.messagingService.subscribe(
            MessageTypeEnum.CHECKOUT_PAYMENT_COMPLETED,
            async (completedMessage) => {
                console.log('MONTONIO-JS: CHECKOUT_PAYMENT_COMPLETED (from main iframe)', completedMessage);

                this.cleanupPaymentAuth();

                try {
                    const result = await this.getPaymentResult(completedMessage.payload.paymentIntentUuid);
                    this.handlePaymentSuccess(result);
                } catch (e) {
                    this.handlePaymentError(e as Error);
                }
            },
            this.iframe,
        );
    }

    /**
     * Listen for payment failure messages and handle the error
     */
    private setUpPaymentFailedListener(): void {
        this.messagingService.subscribe(
            MessageTypeEnum.CHECKOUT_PAYMENT_FAILED,
            (failedMessage) => {
                console.error('MONTONIO-JS: CHECKOUT_PAYMENT_FAILED (from main iframe)', failedMessage);

                this.cleanupPaymentAuth();

                // Send error message to the main iframe to be displayed above the payment form
                this.messagingService.postMessage(this.iframe, {
                    name: MessageTypeEnum.CHECKOUT_SEND_PAYMENT_FAILED_DATA,
                    payload: failedMessage.payload,
                });

                // Reject the promise and call error callback
                this.handlePaymentError(new PaymentFailedError(failedMessage.payload));
            },
            this.iframe,
        );
    }

    /**
     * Listen for validation result messages from the iframe
     */
    private setUpValidationListener(): void {
        this.messagingService.subscribe(
            MessageTypeEnum.CHECKOUT_VALIDATE_FIELDS_RESULT,
            (res) => {
                console.log('MONTONIO-JS: CHECKOUT_VALIDATE_FIELDS_RESULT', res);
                if (!res.payload.isValid) {
                    this.handlePaymentError(new ValidationError());
                }
            },
            this.iframe,
        );
    }

    /**
     * Listen for payment auth (3DS) requests and initialize the PaymentAuth component
     */
    private setUpPaymentAuthListener(): void {
        this.messagingService.subscribe(
            MessageTypeEnum.CHECKOUT_START_PAYMENT_AUTH,
            async (message) => {
                try {
                    console.log('MONTONIO-JS: PAYMENT_AUTH_STARTED', message);

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
                    // Still, we need to throw an error to the SDK user
                    this.handlePaymentError(error as Error);
                }
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
                console.log('MONTONIO-JS: getPaymentResult: Fetching return URL from:', url);
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
                console.error('MONTONIO-JS: getPaymentResult: Error fetching return URL:', error);
            }

            // Wait for 1 second before the next attempt
            if (attempts < MAX_ATTEMPTS) {
                await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_ATTEMPTS_IN_MS));
            }
        }

        throw new FailedToFetchReturnUrlError({ attempts });
    }

    /**
     * Destroy the PaymentAuth component and remove it from success/failure subscriptions
     */
    private cleanupPaymentAuth(): void {
        if (this.paymentAuth) {
            // Remove the PaymentAuth iframe from the payment completion/failure subscriptions
            this.messagingService.removeIframeFromSubscription(
                MessageTypeEnum.CHECKOUT_PAYMENT_COMPLETED,
                this.paymentAuth.iframe,
            );
            this.messagingService.removeIframeFromSubscription(
                MessageTypeEnum.CHECKOUT_PAYMENT_FAILED,
                this.paymentAuth.iframe,
            );

            // Clean up and destroy the PaymentAuth component
            this.paymentAuth.cleanup();
            this.paymentAuth = null;
        }
    }

    /**
     * Handle payment success - calls the onSuccess callback
     */
    private handlePaymentSuccess(result: PaymentResult): void {
        this.options.onSuccess(result);
        console.log('MONTONIO-JS: handlePaymentSuccess: onSuccess callback called with result:', result);
    }

    /**
     * Handle payment error - calls the onError callback
     */
    private handlePaymentError(error: Error): void {
        this.options.onError(error);
        console.error('MONTONIO-JS: handlePaymentError: onError callback called with error:', error);
    }
}
