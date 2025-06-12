import { CheckoutOptions, GatewayUrlResponse, LocaleEnum } from './types';
import { Iframe } from '../Iframe/Iframe';
import { ConfigService, HTTPService } from '../../services';
import { getElement } from '../../utils';
import { Environment } from '../../services/Config/types';
import { MessageTypeEnum, CheckoutChangeLocaleMessage, AdyenEmbeddedIframeReadyMessage } from '../Iframe/types';

export class MontonioCheckout {
    private http: HTTPService;
    private config: ConfigService;
    private iframe!: Iframe;

    private options: CheckoutOptions;
    private environment: Environment;
    private locale: LocaleEnum | null;

    private mountElement: HTMLElement | null = null;

    public loaded: boolean = false;

    constructor(options: CheckoutOptions) {
        this.options = options;
        this.environment = options.environment || 'production';
        this.locale = options.locale || null;
        this.http = HTTPService.getInstance();
        this.config = ConfigService.getInstance();
    }

    /**
     * Mount the checkout to the DOM
     */
    public async mount(mountTo: string | HTMLElement): Promise<boolean> {
        try {
            this.mountElement = getElement(mountTo);

            const sessionData = await this.fetchSession();
            this.iframe = new Iframe({
                src: sessionData.url,
                queryParams: this.locale ? { locale: this.locale } : undefined,
                mountElement: this.mountElement,
            });

            this.iframe.mount();

            await this.iframe.waitForMessage<AdyenEmbeddedIframeReadyMessage>(
                MessageTypeEnum.ADYEN_EMBEDDED_IFRAME_READY,
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

        // add preferredLocale to the query params
        const url = `${baseUrl}/api/sessions/${this.options.sessionUuid}/gateway-url?preferredLocale=${this.locale}`;

        return await this.http.get<GatewayUrlResponse>(url);
    }

    public async validateOrReject(): Promise<void> {
        // TODO: Temporary rule disable: the method will later have more awaitable things
        // eslint-disable-next-line @typescript-eslint/await-thenable
        return await console.log('Payment form validation not implemented yet');
    }

    public async submitPayment(): Promise<void> {
        // TODO: Temporary rule disable: the method will later have more awaitable things
        // eslint-disable-next-line @typescript-eslint/await-thenable
        return await this.iframe.postMessage({ name: MessageTypeEnum.CHECKOUT_SUBMIT_PAYMENT });
    }

    private cleanup(): void {
        if (this.iframe) {
            this.iframe.unmount();
        }
    }
}
