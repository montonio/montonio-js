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
import { MessageByType, MessageTypeEnum } from '../../services/Messaging';
import { MontonioCheckoutNotInitializedError, PaymentFailedError, ValidationError } from '../../common';

export class MontonioCheckout extends BaseComponent {
    private options: CheckoutOptions;
    private readonly environment: EnvironmentOptions;
    private paymentAuth: PaymentAuth | null = null;

    // Store the subscription ids so we can add the PaymentAuth iframe to the subscriptions if needed
    // and unsubscribe when the payment fails or is completed
    // private submitPaymentSubscriptions = {
    //     completedId: '',
    //     failedId: '',
    //     authId: '',
    //     validationFailedId: '',
    // };

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
                styles: {
                    minHeight: '230px',
                },
            });

            this.iframe.mount();

            await this.iframe.waitForMessage(MessageTypeEnum.CHECKOUT_PAYMENT_COMPONENT_READY);

            this.loaded = true;

            return true;
        } catch (error) {
            this.cleanup();
            throw error;
        }
    }

    public updateOptions(options: UpdatableCheckoutOptions): void {
        if (!this.loaded) {
            throw new MontonioCheckoutNotInitializedError();
        }

        if (options.locale !== undefined) {
            this.options.locale = options.locale;

            this.iframe.postMessage({
                name: MessageTypeEnum.CHECKOUT_CHANGE_LOCALE,
                payload: { locale: options.locale },
            });
        }
    }

    public async validateOrReject(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.iframe
                .waitForMessage(MessageTypeEnum.CHECKOUT_VALIDATE_FIELDS_RESULT)
                .then((res) => {
                    if (res.payload.isValid) {
                        resolve();
                    } else {
                        reject(new ValidationError());
                    }
                })
                .catch(() => reject(new ValidationError()));

            this.iframe.postMessage({
                name: MessageTypeEnum.CHECKOUT_VALIDATE_FIELDS,
            });
        });
    }

    public async submitPayment(): Promise<PaymentResult> {
        if (!this.loaded) {
            throw new MontonioCheckoutNotInitializedError();
        }

        return new Promise((resolve, reject) => {
            // Handler for payment completion
            this.messaging.subscribe(
                MessageTypeEnum.CHECKOUT_PAYMENT_COMPLETED,
                async (completedMessage) => {
                    console.log('CHECKOUT_PAYMENT_COMPLETED (from main iframe)', completedMessage);

                    const result = await this.handlePaymentCompletedMessage(completedMessage);

                    // Resolve the promise to the SDK user
                    resolve(result);
                    this.cleanupAfterPaymentSubmission();
                },
                [this.iframe],
            );

            // Handler for payment failure
            this.messaging.subscribe(
                MessageTypeEnum.CHECKOUT_PAYMENT_FAILED,
                (failedMessage) => {
                    console.error('CHECKOUT_PAYMENT_FAILED (from main iframe)', failedMessage);

                    // Send error message to the main iframe to be displayed above the payment form
                    this.iframe.postMessage({
                        name: MessageTypeEnum.CHECKOUT_SEND_PAYMENT_FAILED_DATA,
                        payload: failedMessage.payload,
                    });

                    // Reject the promise to the SDK user
                    reject(new PaymentFailedError(failedMessage.payload));
                    this.cleanupAfterPaymentSubmission();
                },
                [this.iframe],
            );

            // Handler for validation errors
            this.messaging.subscribe(
                MessageTypeEnum.CHECKOUT_VALIDATE_FIELDS_RESULT,
                (res) => {
                    console.log('CHECKOUT_VALIDATE_FIELDS_RESULT', res);
                    if (!res.payload.isValid) {
                        reject(new ValidationError());
                    }
                    this.cleanupAfterPaymentSubmission();
                },
                [this.iframe],
            );

            // Handler for Payment Auth (3DS) in case it is requested by the main iframe
            this.messaging.subscribe(
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
                        this.messaging.addSourceToSubscription(
                            MessageTypeEnum.CHECKOUT_PAYMENT_COMPLETED,
                            paymentAuthIframe.getContentWindow(),
                        );
                        this.messaging.addSourceToSubscription(
                            MessageTypeEnum.CHECKOUT_PAYMENT_FAILED,
                            paymentAuthIframe.getContentWindow(),
                        );
                    } catch (error) {
                        // This error shouldn't happen in normal payment failures, only if the payment auth iframe initialization fails
                        // Still, we need to reject the promise to the SDK user
                        reject(error);
                    }
                },
                [this.iframe],
            );

            // Submit the payment
            this.iframe.postMessage({
                name: MessageTypeEnum.CHECKOUT_SUBMIT_PAYMENT,
            });
        });
    }

    private async fetchSession(): Promise<GatewayUrlResponse> {
        const baseUrl = this.config.getConfig('stargateUrl', this.environment);

        const url = `${baseUrl}/api/sessions/${this.options.sessionUuid}/gateway-url${
            this.options.locale ? `?preferredLocale=${this.options.locale}` : ''
        }`;

        return await this.http.get<GatewayUrlResponse>(url);
    }

    /**
     * After a payment has completed, fetch the return URL. Keep fetching until we
     * exhaust all the attempts
     */
    private async handlePaymentCompletedMessage(
        paymentCompletedMessage: MessageByType<MessageTypeEnum.CHECKOUT_PAYMENT_COMPLETED>,
    ): Promise<PaymentResult> {
        const baseUrl = this.config.getConfig('stargateUrl', this.environment);
        const url = `${baseUrl}/api/payment-intents/${paymentCompletedMessage.payload.paymentIntentUuid}/return-url`;
        const MAX_ATTEMPTS = 10;
        const DELAY_BETWEEN_ATTEMPTS_IN_MS = 1000;
        let attempts = 0;

        while (attempts < MAX_ATTEMPTS) {
            try {
                const result = await this.http.get<ReturnUrlResponse>(url);
                attempts++;
                if (result?.merchantReturnUrl) {
                    return {
                        returnUrl: result.merchantReturnUrl,
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

        throw new Error(`Failed to fetch the return url after ${attempts} attempts`);
    }

    private cleanupAfterPaymentSubmission(): void {
        this.messaging.clearAllSubscriptions();
        // this.messaging.unsubscribe(this.submitPaymentSubscriptions.completedId);
        // this.messaging.unsubscribe(this.submitPaymentSubscriptions.failedId);
        // this.messaging.unsubscribe(this.submitPaymentSubscriptions.authId);

        this.cleanupPaymentAuth();
    }

    private cleanupPaymentAuth(): void {
        if (this.paymentAuth) {
            this.paymentAuth.cleanup();
            this.paymentAuth = null;
        }
    }
}
