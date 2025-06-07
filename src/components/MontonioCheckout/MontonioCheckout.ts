import { CheckoutOptions, GatewayUrlResponse } from './types';
import { Iframe } from '../Iframe/Iframe';
import { ConfigService, HTTPService } from '../../services';
import { getElement } from '../../utils';
import { Environment } from '../../services/Config/types';
import { MessageTypeEnum } from '../../services/Messaging/types';

export class MontonioCheckout {
    private options: CheckoutOptions;
    private environment: Environment;
    private http: HTTPService;
    private config: ConfigService;
    private iframe!: Iframe;
    private mountElement: HTMLElement | null = null;
    // private readonly READY_MESSAGE_TYPE = 'montonio:checkout.iframe.ready';

    constructor(options: CheckoutOptions) {
        this.options = options;
        this.environment = options.environment || 'production';
        this.http = HTTPService.getInstance();
        this.config = ConfigService.getInstance();
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
            this.mountElement = await getElement(this.options.mountTo);
            const sessionData = await this.fetchSession();

            this.iframe = new Iframe({
                src: sessionData.url,
                mountElement: this.mountElement,
            });

            this.iframe.mount();

            await this.iframe.waitForLoad();

            return this;
        } catch (error) {
            // Clean up if initialization fails
            this.cleanup();
            throw error;
        }
    }

    /**
     * Fetch the session URL from the API
     */
    private async fetchSession(): Promise<GatewayUrlResponse> {
        const baseUrl = this.config.getConfig('stargateUrl', this.environment);

        const url = `${baseUrl}/api/sessions/${this.options.sessionUuid}/gateway-url`;

        return await this.http.get<GatewayUrlResponse>(url);
    }

    /**
     * Wait for the ready message from the iframe
     * @returns Promise that resolves when the ready message is received
     */
    // private waitForReadyMessage(): Promise<void> {
    //     return new Promise((resolve, reject) => {
    //         // Set a timeout for the ready message
    //         const timeoutId = setTimeout(() => {
    //             console.error('Timeout waiting for the checkout iframe to be ready');
    //             resolve();
    //         }, 10000);

    //         // Listen for the ready message
    //         const cleanup = this.messaging.onMessage(this.READY_MESSAGE_TYPE, () => {
    //             clearTimeout(timeoutId);
    //             cleanup();
    //             resolve();
    //         });
    //     });
    // }

    public async validateOrReject(): Promise<void> {
        return await console.log('Payment form validation not implemented yet');
    }

    public async submitPayment(): Promise<void> {
        return await this.iframe.postMessage({ name: MessageTypeEnum.SUBMIT_PAYMENT }, '*');
    }

    private cleanup(): void {
        if (this.iframe) {
            this.iframe.unmount();
        }
    }
}
