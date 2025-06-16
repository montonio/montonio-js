import { PaymentAuthOptions } from './types';
import { Iframe } from '../Iframe/Iframe';
import {
    MessageTypeEnum,
    CheckoutPaymentAuthComponentReadyMessage,
    CheckoutPaymentCompletedMessage,
    CheckoutSendPaymentAuthDataMessage,
    CheckoutPaymentFailedMessage,
} from '../../services/Messaging/types';

export class PaymentAuth {
    private iframe: Iframe | null = null;
    private options: PaymentAuthOptions;
    private mountElement: HTMLElement;
    private completionCleanup: (() => void) | null = null;
    private errorCleanup: (() => void) | null = null;

    constructor(options: PaymentAuthOptions) {
        this.options = options;
        this.mountElement = options.mountElement || document.body;
    }

    /**
     * Initialize and mount the payment auth iframe
     */
    public async initialize(): Promise<void> {
        // Handle redirect-based auth
        // @ts-expect-error - invalid typings for paymentAuthData
        if (this.options.paymentAuthData.type === 'redirect') {
            this.redirectViaPost(this.options.paymentAuthData); // TODO: This data should be standardized and not Adyen specific
            return;
        }

        // Create payment auth iframe for 3DS
        this.iframe = new Iframe({
            src: this.options.paymentAuthUrl,
            mountElement: this.mountElement,
            styles: {
                width: '100vw',
                height: '100vh',
                position: 'fixed',
                top: '0',
                left: '0',
                zIndex: '16777271',
            },
        });

        this.iframe.mount();

        // Wait for the payment auth component to be ready
        await this.iframe.waitForMessage<CheckoutPaymentAuthComponentReadyMessage>(
            MessageTypeEnum.CHECKOUT_PAYMENT_AUTH_COMPONENT_READY,
        );

        // Submit payment auth data to the payment auth iframe
        const message: CheckoutSendPaymentAuthDataMessage = {
            name: MessageTypeEnum.CHECKOUT_SEND_PAYMENT_AUTH_DATA,
            payload: this.options.paymentAuthData, // TODO: This data should be standardized and not Adyen specific
        };
        this.iframe.postMessage(message);
    }

    /**
     * Wait for payment completion from the auth iframe
     * Uses subscription instead of waitForMessage to avoid timeout issues with 3DS
     */
    public async waitForCompletion(): Promise<CheckoutPaymentCompletedMessage> {
        if (!this.iframe) {
            throw new Error('PaymentAuth iframe not initialized. Call initialize() first.');
        }

        return new Promise((resolve, reject) => {
            this.completionCleanup = this.iframe!.subscribe<CheckoutPaymentCompletedMessage>(
                MessageTypeEnum.CHECKOUT_PAYMENT_COMPLETED,
                (message: CheckoutPaymentCompletedMessage) => {
                    this.cleanupSubscriptions();
                    resolve(message);
                },
            );

            // Handle payment failures
            this.errorCleanup = this.iframe!.subscribe<CheckoutPaymentFailedMessage>(
                MessageTypeEnum.CHECKOUT_PAYMENT_FAILED,
                (message: CheckoutPaymentFailedMessage) => {
                    this.cleanupSubscriptions();
                    reject(new Error(`Payment failed: ${JSON.stringify(message)}`));
                },
            );
        });
    }

    /**
     * Handle redirect-based payment auth
     */
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

    /**
     * Clean up subscriptions
     */
    private cleanupSubscriptions(): void {
        if (this.completionCleanup) {
            this.completionCleanup();
            this.completionCleanup = null;
        }
        if (this.errorCleanup) {
            this.errorCleanup();
            this.errorCleanup = null;
        }
    }

    /**
     * Clean up the payment auth iframe
     */
    public destroy(): void {
        this.cleanupSubscriptions();
        if (this.iframe) {
            this.iframe.unmount();
            this.iframe = null;
        }
    }
}
