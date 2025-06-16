import { IframeOptions } from './types';
import { MessageData, MessageTypeEnum } from '../../services/Messaging/types';
import { MessagingService } from '../../services';

/**
 * Iframe component for rendering and communicating with iframes
 */
export class Iframe {
    private element: HTMLIFrameElement;
    private readonly defaultStyles: Partial<CSSStyleDeclaration> = {
        width: '100%',
        height: '100%',
    };
    private messagingService: MessagingService;
    private subscriptionIds: Set<string> = new Set();

    constructor(private options: IframeOptions) {
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
        // Clear the container first
        // this.options.mountElement.innerHTML = '';

        // Append the iframe
        this.options.mountElement.appendChild(this.element);

        return this.element;
    }

    public unmount(): void {
        // Clear all subscriptions for this iframe
        this.subscriptionIds.forEach((id) => {
            this.messagingService.unsubscribe(id);
        });
        this.subscriptionIds.clear();

        // Clear subscriptions by source if iframe is loaded
        if (this.element.contentWindow) {
            this.messagingService.clearSubscriptionsForSource(this.element.contentWindow);
        }

        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    public getElement(): HTMLIFrameElement {
        return this.element;
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
    public waitForMessage<T extends MessageData = MessageData>(
        messageType: MessageTypeEnum,
        timeout = 10000,
    ): Promise<T> {
        return this.messagingService.waitForMessage<T>(messageType, this.element.contentWindow || undefined, timeout);
    }

    /**
     * Subscribe to messages from the iframe
     * @param messageType The message type to listen for
     * @param handler Handler function to call when the message is received
     * @returns Cleanup function to remove the listener
     */
    public subscribe<T extends MessageData = MessageData>(
        messageType: MessageTypeEnum,
        handler: (message: T) => void,
    ): () => void {
        const subscriptionId = this.messagingService.subscribe<T>(
            messageType,
            handler,
            this.element.contentWindow || undefined,
        );

        this.subscriptionIds.add(subscriptionId);

        // Return a cleanup function
        return () => {
            this.messagingService.unsubscribe(subscriptionId);
            this.subscriptionIds.delete(subscriptionId);
        };
    }

    /**
     * Post a message to the child iframe
     */
    public postMessage(messageData: MessageData, targetOrigin: string = '*'): void {
        if (!this.element.contentWindow) {
            throw new Error('Iframe is not available. Make sure the iframe is mounted and loaded.');
        }

        this.messagingService.postMessage(this.element.contentWindow, messageData, targetOrigin);
    }
}
