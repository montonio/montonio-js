import { CheckoutOptions, CheckoutSessionData } from './types';
import { Iframe } from '../Iframe/Iframe';
import { HTTPService, MessagingService } from '../../services';
import { getElement } from '../../utils';

export class MontonioCheckout {
    private options: CheckoutOptions;
    private http: HTTPService;
    private messaging: MessagingService;
    private iframe: Iframe | null = null;
    private mountElement: HTMLElement | null = null;
    private readonly READY_MESSAGE_TYPE = 'montonio:checkoutIframeReady';

    constructor(options: CheckoutOptions) {
        this.options = {
            environment: 'production', // Set default environment
            ...options,
        };
        this.http = new HTTPService();
        this.messaging = new MessagingService();
    }

    /**
     * Initialize the checkout
     * 1. Fetch the checkout session
     * 2. Create and mount the iframe
     * 3. Wait for the ready message from the iframe
     * @returns Promise that resolves with the MontonioCheckout instance
     */
    public async initialize(): Promise<this> {
        try {
            // Get the mount element
            this.mountElement = getElement(this.options.mountTo);

            // Fetch the checkout session
            const sessionData = await this.fetchCheckoutSession();

            // Create and mount the iframe
            this.iframe = new Iframe({
                src: sessionData.checkoutSessionUrl,
                mountElement: this.mountElement,
                styles: {
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    overflow: 'hidden',
                },
            });

            // Mount the iframe
            this.iframe.mount();

            // Wait for the iframe to load and the ready message
            await Promise.all([this.iframe.waitForLoad(), this.waitForReadyMessage()]);

            return this;
        } catch (error) {
            // Clean up if initialization fails
            this.cleanup();
            throw error;
        }
    }

    /**
     * Fetch the checkout session data from the API
     * @returns Promise that resolves with the checkout session data
     */
    private async fetchCheckoutSession(): Promise<CheckoutSessionData> {
        const baseUrl =
            this.options.environment === 'sandbox'
                ? 'https://sandbox-stargate.montonio.com'
                : 'https://stargate.montonio.com';

        const url = `${baseUrl}/api/checkout-sessions/${this.options.checkoutSessionUuid}`;

        return await this.http.get<CheckoutSessionData>(url);
    }

    /**
     * Wait for the ready message from the iframe
     * @returns Promise that resolves when the ready message is received
     */
    private waitForReadyMessage(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Set a timeout for the ready message
            const timeoutId = setTimeout(() => {
                reject(new Error('Timeout waiting for the checkout iframe to be ready'));
            }, 10000);

            // Listen for the ready message
            const cleanup = this.messaging.onMessage(this.READY_MESSAGE_TYPE, () => {
                clearTimeout(timeoutId);
                cleanup();
                resolve();
            });
        });
    }

    /**
     * Validate the payment form
     * @returns Promise that resolves if validation passes, rejects with errors if it fails
     */
    public async validateOrReject(): Promise<void> {
        return await console.log('Validation not implemented yet');
    }

    /**
     * Submit the payment
     * @param paymentIntentUuid The payment intent UUID
     * @returns Promise that resolves with the payment result
     */
    public async submitPayment(): Promise<void> {
        return await console.log('Payment submission not implemented yet.');
    }

    /**
     * Clean up resources
     */
    private cleanup(): void {
        if (this.iframe) {
            this.iframe.unmount();
            this.iframe = null;
        }
    }
}
