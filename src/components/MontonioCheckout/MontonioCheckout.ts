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
import { EnvironmentOptions, Environment } from '../../services/Config/types';
import {
    MessageTypeEnum,
    CheckoutChangeLocaleMessage,
    CheckoutPaymentComponentReadyMessage,
    CheckoutPaymentCompletedMessage,
    CheckoutStartPaymentAuthMessage,
    CheckoutPaymentFailedMessage,
    CheckoutSubmitPaymentMessage,
    CheckoutSendPaymentFailedDataMessage,
} from '../../services/Messaging/types';
import { MontonioCheckoutNotInitializedError, PaymentFailedError } from '../../common';

export class MontonioCheckout extends BaseComponent {
    private options: CheckoutOptions;
    private environment: EnvironmentOptions;
    private paymentAuth: PaymentAuth | null = null;

    // Store the subscription ids so we can add the PaymentAuth iframe to the subscriptions if needed
    // and unsubscribe when the payment fails or is completed
    private submitPaymentSubscriptions = {
        completedId: '',
        failedId: '',
        authId: '',
    };

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
            console.log('SDK: sessionData from Stargate', sessionData);
            this.iframe = new Iframe({
                src: sessionData.url,
                mountElement: this.mountElement,
                styles: {
                    minHeight: '230px',
                },
            });

            this.iframe.mount();

            await this.iframe.waitForMessage<CheckoutPaymentComponentReadyMessage>(
                MessageTypeEnum.CHECKOUT_PAYMENT_COMPONENT_READY,
            );

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

            this.getIframe().postMessage<CheckoutChangeLocaleMessage>({
                name: MessageTypeEnum.CHECKOUT_CHANGE_LOCALE,
                payload: { locale: options.locale },
            });
        }
    }

    public async validateOrReject(): Promise<void> {
        // TODO: Temporary rule disable: the method will later have more awaitable things
        // eslint-disable-next-line @typescript-eslint/await-thenable
        return await console.log('Payment form validation not implemented yet');
    }

    public async submitPayment(): Promise<PaymentResult> {
        if (!this.loaded) {
            throw new MontonioCheckoutNotInitializedError();
        }

        return new Promise((resolve, reject) => {
            // Handler for payment completion
            this.submitPaymentSubscriptions.completedId = this.messaging.subscribe<CheckoutPaymentCompletedMessage>(
                MessageTypeEnum.CHECKOUT_PAYMENT_COMPLETED,
                async (completedMessage) => {
                    console.log('CHECKOUT_PAYMENT_COMPLETED (from main iframe)', completedMessage);

                    const result = await this.handlePaymentCompletedMessage(completedMessage);

                    // Resolve the promise to the SDK user
                    resolve(result);
                    this.cleanupAfterPaymentSubmission();
                },
                [this.getIframe()],
            );

            // Handler for payment failure
            this.submitPaymentSubscriptions.failedId = this.messaging.subscribe<CheckoutPaymentFailedMessage>(
                MessageTypeEnum.CHECKOUT_PAYMENT_FAILED,
                (failedMessage) => {
                    console.error('CHECKOUT_PAYMENT_FAILED (from main iframe)', failedMessage);

                    // Send error message to the main iframe to be displayed above the payment form
                    this.getIframe().postMessage<CheckoutSendPaymentFailedDataMessage>({
                        name: MessageTypeEnum.CHECKOUT_SEND_PAYMENT_FAILED_DATA,
                        payload: failedMessage.payload,
                    });

                    // Reject the promise to the SDK user
                    reject(new PaymentFailedError(failedMessage.payload));
                    this.cleanupAfterPaymentSubmission();
                },
                [this.getIframe()],
            );

            // Handler for Payment Auth (3DS) in case it is requested by the main iframe
            this.submitPaymentSubscriptions.authId = this.messaging.subscribe<CheckoutStartPaymentAuthMessage>(
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
                        const paymentAuthIframe = this.paymentAuth.getIframe();
                        this.messaging.addSourceToSubscription(
                            this.submitPaymentSubscriptions.completedId,
                            paymentAuthIframe.getContentWindow(),
                        );
                        this.messaging.addSourceToSubscription(
                            this.submitPaymentSubscriptions.failedId,
                            paymentAuthIframe.getContentWindow(),
                        );
                    } catch (error) {
                        // This error shouldn't happen in normal payment failures, only if the payment auth iframe initialization fails
                        // Still, we need to reject the promise to the SDK user
                        reject(error);
                    }
                },
                [this.getIframe()],
            );

            // Submit the payment
            this.getIframe().postMessage<CheckoutSubmitPaymentMessage>({
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
        paymentCompletedMessage: CheckoutPaymentCompletedMessage,
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
        this.messaging.unsubscribe(this.submitPaymentSubscriptions.completedId);
        this.messaging.unsubscribe(this.submitPaymentSubscriptions.failedId);
        this.messaging.unsubscribe(this.submitPaymentSubscriptions.authId);

        this.cleanupPaymentAuth();
    }

    protected cleanup(): void {
        this.cleanupPaymentAuth();
        super.cleanup();
    }

    private cleanupPaymentAuth(): void {
        if (this.paymentAuth) {
            this.paymentAuth.destroy();
            this.paymentAuth = null;
        }
    }
}
