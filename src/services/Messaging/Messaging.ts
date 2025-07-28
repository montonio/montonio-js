import { MessageByType, Messages, MessageSubscription, MessageTypeEnum } from './types';
import { Iframe } from '../../components/Iframe/Iframe';

/**
 * Service for sending and receiving messages between iframes
 * Implemented as a singleton
 */
export class MessagingService {
    private subscriptions: Map<MessageTypeEnum, MessageSubscription> = new Map();

    public constructor() {
        this.setupMessageListener();
    }

    /**
     * Subscribe to messages of a specific type from a specific iframe
     * @param messageType The message type to listen for
     * @param handler Handler function to call when the message is received
     * @param iframe Iframe object to listen to
     * @returns Subscription ID that can be used to unsubscribe
     */
    public subscribe<T extends MessageTypeEnum>(
        messageType: T,
        handler: (message: MessageByType<T>) => void,
        iframe: Iframe,
    ): void {
        if (this.subscriptions.has(messageType)) {
            throw new Error(`Subscription for '${messageType}' already exists`);
        }

        // Convert Iframe object to Window object
        const windowSource = this.extractWindowFromIframe(iframe);

        this.subscriptions.set(messageType, {
            handler: handler as (message: Messages) => void,
            sources: [windowSource],
        });
    }

    /**
     * Add an iframe to an existing subscription
     */
    public addIframeToSubscription(messageType: MessageTypeEnum, iframe: Iframe): void {
        const subscription = this.subscriptions.get(messageType);
        if (!subscription) {
            throw new Error(`Subscription for '${messageType}' not found`);
        }

        const windowSource = this.extractWindowFromIframe(iframe);

        if (!subscription.sources.includes(windowSource)) {
            subscription.sources.push(windowSource);
        }
    }

    public unsubscribe(messageType: MessageTypeEnum): void {
        this.subscriptions.delete(messageType);
    }

    /**
     * Wait for a specific message type from specific sources
     * @param messageType The message type to wait for
     * @param sources Array of specific iframe windows or Iframe objects to listen to
     * @param timeout Timeout in milliseconds
     * @returns Promise that resolves when the message is received or rejects on timeout
     */
    public waitForMessage<T extends MessageTypeEnum>(
        messageType: T,
        iframe: Iframe,
        timeout = 10000,
    ): Promise<MessageByType<T>> {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.unsubscribe(messageType);
                reject(new Error(`Message ${messageType} timeout after ${timeout}ms`));
            }, timeout);

            this.subscribe<T>(
                messageType,
                (message: MessageByType<T>) => {
                    clearTimeout(timeoutId);
                    this.unsubscribe(messageType);
                    resolve(message);
                },
                iframe,
            );
        });
    }

    /**
     * Post a message to a specific iframe window
     */
    public postMessage(iframe: Iframe, messageData: Messages, targetOrigin: string = '*'): void {
        const target = this.extractWindowFromIframe(iframe);
        target.postMessage(messageData, targetOrigin);
    }

    /**
     * Clear all subscriptions for a specific source (useful when unmounting an iframe)
     */
    public clearSubscriptionsForIframe(iframe: Iframe): void {
        const source = this.extractWindowFromIframe(iframe);

        const subscriptionsToRemove: MessageTypeEnum[] = [];

        this.subscriptions.forEach((subscription, key) => {
            if (subscription.sources.includes(source)) {
                // Remove the specific source from the subscription
                subscription.sources = subscription.sources.filter((s) => s !== source);

                // If no sources left, mark subscription for removal
                if (subscription.sources.length === 0) {
                    subscriptionsToRemove.push(key);
                }
            }
        });

        // Remove subscriptions that have no sources left
        subscriptionsToRemove.forEach((id) => {
            this.subscriptions.delete(id);
        });
    }

    /**
     * Clear all subscriptions
     */
    public clearAllSubscriptions(): void {
        this.subscriptions.clear();
    }

    /**
     * Set up the global message listener (called only once)
     */
    private setupMessageListener(): void {
        window.addEventListener('message', (event) => {
            try {
                // Validate that the message is properly formatted
                if (!event.data || typeof event.data !== 'object' || !event.data.name) {
                    return;
                }

                const message = event.data;

                // Find all matching subscriptions
                this.subscriptions.forEach((subscription, key) => {
                    // Check if message type matches
                    if (key !== message.name) {
                        return;
                    }

                    // Check if the event source matches any of the specified sources
                    const sourceMatches = subscription.sources.some((source) => source === event.source);
                    if (!sourceMatches) {
                        return;
                    }

                    // Call the handler
                    try {
                        subscription.handler(message);
                    } catch (error) {
                        console.error('Error in message handler:', error);
                    }
                });
            } catch (error) {
                console.error('Error processing iframe message:', error);
            }
        });
    }

    /**
     * Extract the window source from our Iframe class
     * @param iframe Iframe object to extract the window source from
     * @returns Window object
     */
    private extractWindowFromIframe(iframe: Iframe): Window {
        return iframe.getContentWindow();
    }
}
