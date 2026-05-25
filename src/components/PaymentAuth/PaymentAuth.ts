import { PaymentAuthOptions } from './types';
import { Iframe } from '../Iframe/Iframe';
import { BaseComponent } from '../BaseComponent';
import { MessageTypeEnum, PaymentAuthMessageData } from '../../services/Messaging';
import { disableBodyScroll, restoreBodyOverflow } from '../../utils';

export class PaymentAuth extends BaseComponent {
    private options: PaymentAuthOptions;
    private originalBodyOverflow: string | null = null;

    constructor(options: PaymentAuthOptions) {
        super();
        this.options = options;
        this.mountElement = options.mountElement || document.body;
    }

    /**
     * Initialize and mount the payment auth iframe
     */
    public async initialize(): Promise<void> {
        try {
            // Handle redirect-based payment auth first
            if (this.options.paymentAuthData.type === 'redirect') {
                await this.redirectViaPost(this.options.paymentAuthData);
                return;
            }

            if (!this.options.paymentAuthData.embeddedUrl) {
                throw new Error('Embedded URL is not set in paymentAuthData');
            }

            // Set body overflow hidden to prevent background scrolling during Payment Auth
            const { originalOverflow } = disableBodyScroll();
            this.originalBodyOverflow = originalOverflow;

            // Create iframe for embedded payment auth
            this.iframe = new Iframe({
                src: this.options.paymentAuthData.embeddedUrl,
                mountElement: this.mountElement!,
                styles: {
                    width: '100dvw',
                    height: '100dvh',
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    zIndex: '2147483647',
                },
                resizeOnHeightChange: false,
            });

            this.iframe.mount();

            // Wait for the payment auth component to be ready
            await this.messagingService.waitForMessage(
                MessageTypeEnum.CHECKOUT_PAYMENT_AUTH_COMPONENT_READY,
                this.iframe,
            );

            // Submit payment auth data to the payment auth iframe
            this.messagingService.postMessage(this.iframe, {
                name: MessageTypeEnum.CHECKOUT_SEND_PAYMENT_AUTH_DATA,
                payload: {
                    paymentAuthData: this.options.paymentAuthData,
                },
            });

            this.loaded = true;
        } catch (error) {
            this.destroy();
            throw error;
        }
    }

    /**
     * Destroy the payment auth component and restore body overflow
     */
    public destroy(): void {
        if (this.loaded) {
            // Restore the original body overflow
            restoreBodyOverflow(this.originalBodyOverflow);
        }

        // Call parent method to tear down the iframe and MessagingService
        super.destroy();
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

        // the redirect should happen within 30 seconds, if it doesn't, throw an error
        await new Promise((resolve) => setTimeout(resolve, 30000));
        throw new Error('Redirect timeout: Expected redirect to occur within 30 seconds');
    }
}
