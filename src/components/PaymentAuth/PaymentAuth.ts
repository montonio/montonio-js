import { PaymentAuthOptions } from './types';
import { Iframe } from '../Iframe/Iframe';
import { BaseComponent } from '../BaseComponent';
import {
    MessageTypeEnum,
    CheckoutPaymentAuthComponentReadyMessage,
    CheckoutSendPaymentAuthDataMessage,
    PaymentAuthMessageData,
} from '../../services/Messaging/types';

export class PaymentAuth extends BaseComponent {
    private options: PaymentAuthOptions;

    constructor(options: PaymentAuthOptions) {
        super();
        this.options = options;
        this.mountElement = options.mountElement || document.body;
    }

    /**
     * Initialize and mount the payment auth iframe
     */
    public async initialize(): Promise<void> {
        // Handle redirect-based payment auth first
        if (this.options.paymentAuthData.type === 'redirect') {
            await this.redirectViaPost(this.options.paymentAuthData);
            return;
        }

        if (!this.options.paymentAuthData.embeddedUrl) {
            throw new Error('Embedded URL is not set in paymentAuthData');
        }

        // Create iframe for embedded payment auth
        this.iframe = new Iframe({
            src: this.options.paymentAuthData.embeddedUrl,
            mountElement: this.mountElement!,
            styles: {
                width: '100vw',
                height: '100vh',
                position: 'fixed',
                top: '0',
                left: '0',
                zIndex: '16777271',
            },
            resizeOnHeightChange: false,
        });

        this.iframe.mount();

        // Wait for the payment auth component to be ready
        await this.iframe.waitForMessage<CheckoutPaymentAuthComponentReadyMessage>(
            MessageTypeEnum.CHECKOUT_PAYMENT_AUTH_COMPONENT_READY,
        );

        // Submit payment auth data to the payment auth iframe
        this.iframe.postMessage<CheckoutSendPaymentAuthDataMessage>({
            name: MessageTypeEnum.CHECKOUT_SEND_PAYMENT_AUTH_DATA,
            payload: {
                paymentAuthData: this.options.paymentAuthData,
            },
        });
    }

    /**
     * Handle redirect-based payment auth
     */
    private async redirectViaPost(paymentAuthData: PaymentAuthMessageData): Promise<void> {
        if (!paymentAuthData.redirectUrl) {
            throw new Error('Redirect URL is not set in paymentAuthData');
        }

        const form = document.createElement('form');
        form.method = paymentAuthData.redirectMethod || 'get';
        form.action = paymentAuthData.redirectUrl;
        form.style.display = 'none';

        if (paymentAuthData.formData) {
            for (const [key, value] of Object.entries(paymentAuthData.formData)) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = value as string;
                form.appendChild(input);
            }
        }

        document.body.appendChild(form);
        form.submit();

        // the redirect should happen within 10 seconds, if it doesn't, throw an error
        await new Promise((resolve) => setTimeout(resolve, 10000));
        throw new Error('Redirect timeout: Expected redirect to occur within 10 seconds');
    }
}
