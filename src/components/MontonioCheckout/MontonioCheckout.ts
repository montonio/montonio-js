import { CheckoutOptions, GatewayUrlResponse, LocaleEnum } from './types';
import { Iframe } from '../Iframe/Iframe';
import { PaymentAuth } from '../PaymentAuth/PaymentAuth';
import { ConfigService, HTTPService } from '../../services';
import { getElement } from '../../utils';
import { EnvironmentOptions, Environment } from '../../services/Config/types';
import {
    MessageTypeEnum,
    CheckoutChangeLocaleMessage,
    CheckoutPaymentComponentReadyMessage,
    CheckoutPaymentCompletedMessage,
    CheckoutStartPaymentAuthMessage,
} from '../../services/Messaging/types';

export class MontonioCheckout {
    private http: HTTPService;
    private config: ConfigService;
    private iframe!: Iframe;

    private options: CheckoutOptions;
    private environment: EnvironmentOptions;
    private locale: LocaleEnum | null;

    private mountElement: HTMLElement | null = null;
    private paymentAuth: PaymentAuth | null = null;

    public loaded: boolean = false;

    constructor(options: CheckoutOptions) {
        this.options = options;
        this.environment = options.environment || Environment.PRODUCTION;
        this.locale = options.locale || null;
        this.http = HTTPService.getInstance();
        this.config = ConfigService.getInstance();
    }

    /**
     * Mount the checkout to the DOM
     * @param mountTo - The element to mount the checkout to. Can be a CSS selector or an HTMLElement.
     */
    public async initialize(mountTo: string | HTMLElement): Promise<boolean> {
        try {
            this.mountElement = getElement(mountTo);

            const sessionData = await this.fetchSession();
            console.log('sessionData', sessionData);
            this.iframe = new Iframe({
                src: sessionData.url,
                mountElement: this.mountElement,
            });

            this.iframe.mount();

            await this.iframe.waitForMessage<CheckoutPaymentComponentReadyMessage>(
                MessageTypeEnum.CHECKOUT_PAYMENT_COMPONENT_READY,
            );

            this.loaded = true;

            return true;
        } catch (error) {
            // Clean up if initialization fails
            this.cleanup();
            throw error;
        }
    }

    public setLocale(locale: LocaleEnum): void {
        this.locale = locale;
        const checkoutChangeLocaleMessage: CheckoutChangeLocaleMessage = {
            name: MessageTypeEnum.CHECKOUT_CHANGE_LOCALE,
            payload: { locale },
        };
        this.iframe.postMessage(checkoutChangeLocaleMessage);
    }

    /**
     * Fetch the session URL from the API
     */
    private async fetchSession(): Promise<GatewayUrlResponse> {
        const baseUrl = this.config.getConfig('stargateUrl', this.environment);

        const url = `${baseUrl}/api/sessions/${this.options.sessionUuid}/gateway-url${
            this.locale ? `?preferredLocale=${this.locale}` : ''
        }`;

        return await this.http.get<GatewayUrlResponse>(url);
    }

    public async validateOrReject(): Promise<void> {
        // TODO: Temporary rule disable: the method will later have more awaitable things
        // eslint-disable-next-line @typescript-eslint/await-thenable
        return await console.log('Payment form validation not implemented yet');
    }

    public async submitPayment(): Promise<CheckoutPaymentCompletedMessage> {
        return new Promise((resolve) => {
            // Set up payment auth handler through the iframe component
            const cleanupPaymentAuth = this.iframe.subscribe<CheckoutStartPaymentAuthMessage>(
                MessageTypeEnum.CHECKOUT_START_PAYMENT_AUTH,
                async (message: CheckoutStartPaymentAuthMessage) => {
                    // Handle 3DS authentication
                    console.log('PAYMENT AUTH STARTED', message);

                    try {
                        // Create and initialize payment auth component
                        this.paymentAuth = new PaymentAuth({
                            paymentAuthUrl: message.payload.paymentAuthUrl,
                            paymentAuthData: message.payload.paymentAuthData,
                        });

                        await this.paymentAuth.initialize();

                        // Wait for payment completion from payment auth
                        const completionMessage = await this.paymentAuth.waitForCompletion();
                        console.log('CHECKOUT_PAYMENT_COMPLETED (from auth iframe)', completionMessage);

                        cleanupPaymentAuth();
                        this.cleanupPaymentAuth();
                        resolve(completionMessage);
                    } catch (error) {
                        console.error('Payment auth failed:', error);
                        cleanupPaymentAuth();
                        this.cleanupPaymentAuth();
                        throw error;
                    }
                },
            );

            // Subscribe to payment completion from main iframe
            const cleanupPaymentCompleted = this.iframe.subscribe(
                MessageTypeEnum.CHECKOUT_PAYMENT_COMPLETED,
                (message: CheckoutPaymentCompletedMessage) => {
                    console.log('CHECKOUT_PAYMENT_COMPLETED (from main iframe)', message);
                    cleanupPaymentCompleted();
                    cleanupPaymentAuth();
                    resolve(message);
                },
            );

            // Submit the payment
            this.iframe.postMessage({ name: MessageTypeEnum.CHECKOUT_SUBMIT_PAYMENT });
        });
    }

    private cleanupPaymentAuth(): void {
        if (this.paymentAuth) {
            this.paymentAuth.destroy();
            this.paymentAuth = null;
        }
    }

    private cleanup(): void {
        // Clean up iframes (they handle their own subscription cleanup)
        if (this.iframe) {
            this.iframe.unmount();
        }
        this.cleanupPaymentAuth();
    }

    /**
     * Clean up resources when the checkout is no longer needed
     */
    public destroy(): void {
        this.cleanup();
    }
}
