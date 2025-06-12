import { CheckoutOptions, GatewayUrlResponse, LocaleEnum } from './types';
import { Iframe } from '../Iframe/Iframe';
import { ConfigService, HTTPService } from '../../services';
import { getElement } from '../../utils';
import { Environment } from '../../services/Config/types';
import {
    MessageTypeEnum,
    CheckoutChangeLocaleMessage,
    CheckoutPaymentComponentReadyMessage,
    CheckoutPaymentCompletedMessage,
    CheckoutStartPaymentAuthMessage,
    CheckoutPaymentAuthComponentReadyMessage,
} from '../Iframe/types';

export class MontonioCheckout {
    private http: HTTPService;
    private config: ConfigService;
    private iframe!: Iframe;

    private options: CheckoutOptions;
    private environment: Environment;
    private locale: LocaleEnum | null;

    private mountElement: HTMLElement | null = null;

    private paymentAuthData: unknown;
    private paymentAuthUrl: string | null = null;

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
        return new Promise((resolve) => {
            // set up payment auth handler
            this.iframe.subscribe<CheckoutStartPaymentAuthMessage>(
                MessageTypeEnum.CHECKOUT_START_PAYMENT_AUTH,
                async (message: CheckoutStartPaymentAuthMessage) => {
                    // Handle 3DS authentication
                    console.log('PAYMENT AUTH STARTED', message);
                    this.paymentAuthData = message.payload.paymentAuthData;
                    this.paymentAuthUrl = message.payload.paymentAuthUrl;

                    // if the payment auth data is a redirect, redirect via post
                    // @ts-expect-error - invalid typings
                    if (this.paymentAuthData.type === 'redirect') {
                        this.redirectViaPost(this.paymentAuthData);
                        return;
                    }

                    // append another iframe to the body with the paymentAuthUrl using the Iframe class
                    const paymentAuthIframe = new Iframe({
                        src: this.paymentAuthUrl,
                        mountElement: document.body,
                        styles: {
                            width: '100vw',
                            height: '100vh',
                            position: 'fixed',
                            top: '0',
                            left: '0',
                            zIndex: '16777271',
                        },
                    });
                    paymentAuthIframe.mount();

                    // wait for the payment auth component to be ready
                    await paymentAuthIframe.waitForMessage<CheckoutPaymentAuthComponentReadyMessage>(
                        MessageTypeEnum.CHECKOUT_PAYMENT_AUTH_COMPONENT_READY,
                    );

                    // submit payment auth data to the payment auth iframe
                    paymentAuthIframe.postMessage({
                        name: MessageTypeEnum.CHECKOUT_SEND_PAYMENT_AUTH_DATA,
                        payload: this.paymentAuthData,
                    });

                    // subscribe to the payment auth completed message and unmount the payment auth iframe
                    // paymentAuthIframe.subscribe(
                    //     MessageTypeEnum.CHECKOUT_PAYMENT_AUTH_COMPLETED,
                    //     (message: CheckoutPaymentAuthCompletedMessage) => {
                    //         console.log('payment auth completed');
                    //     },
                    // );

                    // wait for the payment to be completed
                    paymentAuthIframe.subscribe(
                        MessageTypeEnum.CHECKOUT_PAYMENT_COMPLETED,
                        (message: CheckoutPaymentCompletedMessage) => {
                            console.log('CHECKOUT_PAYMENT_COMPLETED', message);
                            paymentAuthIframe.unmount();
                            resolve();
                        },
                    );
                },
            );

            // submit the payment
            this.iframe.postMessage({ name: MessageTypeEnum.CHECKOUT_SUBMIT_PAYMENT });

            // wait for the payment to be completed
            this.iframe.subscribe(
                MessageTypeEnum.CHECKOUT_PAYMENT_COMPLETED,
                (message: CheckoutPaymentCompletedMessage) => {
                    console.log('CHECKOUT_PAYMENT_COMPLETED', message);
                    resolve();
                },
            );
        });
    }

    private redirectViaPost(action: unknown): void {
        const form = document.createElement('form');
        // @ts-expect-error - test
        form.method = action.method; // should be 'POST'
        // @ts-expect-error - test
        form.action = action.url;
        form.style.display = 'none';

        // @ts-expect-error - test
        for (const [key, value] of Object.entries(action.data)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value as string;
            form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
    }

    private cleanup(): void {
        if (this.iframe) {
            this.iframe.unmount();
        }
    }
}
