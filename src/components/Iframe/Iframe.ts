import { IframeOptions } from './types';
import { CheckoutHeightChangedMessage, MessageData, MessageTypeEnum } from '../../services/Messaging/types';
import { MessagingService } from '../../services';

/**
 * Iframe component for rendering and communicating with iframes
 */
export class Iframe {
    private element: HTMLIFrameElement;
    private options: IframeOptions;
    private readonly defaultStyles: Partial<CSSStyleDeclaration> = {
        width: '100%',
        height: '100%',
    };
    private resizeOnHeightChange: boolean;
    private messagingService: MessagingService;
    private subscriptionIds: Set<string> = new Set();

    constructor(options: IframeOptions) {
        this.options = options;
        this.resizeOnHeightChange = options.resizeOnHeightChange ?? true;
        this.element = document.createElement('iframe');
        this.messagingService = MessagingService.getInstance();
        this.setupIframe();
    }

    private setupIframe(): void {
        const { src, allow = 'payment', styles = {} } = this.options;

        // Set iframe attributes
        this.element.src = src;

        this.element.allow = allow;

        // Apply styles
        const combinedStyles = { ...this.defaultStyles, ...styles };
        Object.assign(this.element.style, combinedStyles);
    }

    public mount(): HTMLIFrameElement {
        this.options.mountElement.appendChild(this.element);
        if (this.resizeOnHeightChange) {
            this.startResizing(this.element);
        }
        return this.element;
    }

    public unmount(): void {
        this.clearSubscriptions();

        // Clear subscriptions by source if iframe is loaded
        if (this.element.contentWindow) {
            this.messagingService.clearSubscriptionsForSource(this.element.contentWindow);
        }

        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    public clearSubscriptions(): void {
        this.subscriptionIds.forEach((id) => {
            this.messagingService.unsubscribe(id);
        });
        this.subscriptionIds.clear();
    }

    public getElement(): HTMLIFrameElement {
        return this.element;
    }

    /**
     * Get the Window object of the iframe
     */
    public getContentWindow(): Window {
        if (!this.element.contentWindow) {
            throw new Error('Iframe contentWindow is not available. Make sure the iframe is mounted and loaded.');
        }
        return this.element.contentWindow;
    }

    /**
     * Wait for the iframe to load
     * @param timeout Timeout in milliseconds
     * @returns Promise that resolves when the iframe is loaded or rejects on timeout
     */
    public waitForLoad(timeout = 10000): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Iframe load timeout after ${timeout}ms`));
            }, timeout);

            this.element.onload = () => {
                clearTimeout(timeoutId);
                resolve();
            };
        });
    }

    /**
     * Wait for a specific message from the iframe
     * @param messageType The message type to wait for
     * @param timeout Timeout in milliseconds
     * @returns Promise that resolves when the message is received or rejects on timeout
     */
    public waitForMessage<T extends MessageData = MessageData>(messageType: T['name'], timeout = 10000): Promise<T> {
        const contentWindow = this.element.contentWindow;
        if (!contentWindow) {
            throw new Error('Iframe contentWindow is not available. Make sure the iframe is mounted and loaded.');
        }
        return this.messagingService.waitForMessage<T>(messageType, [contentWindow], timeout);
    }

    /**
     * Subscribe to messages from the iframe with automatic cleanup
     * Subscriptions are automatically cleaned up when the iframe is unmounted
     * @param messageType The message type to listen for
     * @param handler Handler function to call when the message is received
     */
    public subscribe<T extends MessageData = MessageData>(messageType: T['name'], handler: (message: T) => void): void {
        const contentWindow = this.element.contentWindow;
        if (!contentWindow) {
            throw new Error('Iframe contentWindow is not available. Make sure the iframe is mounted and loaded.');
        }
        const subscriptionId = this.messagingService.subscribe<T>(messageType, handler, [contentWindow]);

        this.subscriptionIds.add(subscriptionId);
    }

    /**
     * Post a message to the child iframe
     */
    public postMessage<T extends MessageData>(messageData: T, targetOrigin: string = '*'): void {
        if (!this.element.contentWindow) {
            throw new Error('Iframe is not available. Make sure the iframe is mounted and loaded.');
        }

        this.messagingService.postMessage(this.element.contentWindow, messageData, targetOrigin);
    }

    public startResizing(element: HTMLIFrameElement) {
        this.subscribe<CheckoutHeightChangedMessage>(MessageTypeEnum.CHECKOUT_HEIGHT_CHANGED, (message) => {
            element.style.height = message.payload.height + 'px';
        });
    }
}
