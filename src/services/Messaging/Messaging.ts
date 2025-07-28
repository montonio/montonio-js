import { MessageByType, Messages, MessageSubscription, MessageTypeEnum } from './types';
import { Iframe } from '../../components';

/**
 * Service for sending and receiving messages between iframes.
 * Meant to be initialized separately for each component
 * to clearly separate message subscriptions for each component.
 */
export class MessagingService {
    /**
     * Each message type can have only one handler function but multiple source windows.
     * For example, the "payment complete" message can be listened to from both the MontonioCheckout
     * component and the PaymentAuth (3DS) component - handled by the same callback.
     */
    private subscriptions: Map<MessageTypeEnum, MessageSubscription> = new Map();

    public constructor() {
        this.setupMessageListener();
    }

    /**
     * Subscribe to messages of a specific type from a specific source iframe
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

    /**
     * Wait for a specific message type from a specific source Iframe
     * @param messageType The message type to wait for
     * @param iframe Iframe object to listen to
     * @param timeout Timeout in milliseconds
     * @returns Promise that resolves when the message is received or rejects on timeout
     */
    public waitForMessage<T extends MessageTypeEnum>(
        messageType: T,
        iframe: Iframe,
        timeout = 10000,
    ): Promise<MessageByType<T>> {
        return new Promise((resolve, reject) => {
            // Timeout to remove subscription and reject promise
            const timeoutId = setTimeout(() => {
                this.removeIframeFromSubscription(messageType, iframe);
                reject(new Error(`Message ${messageType} timeout after ${timeout}ms`));
            }, timeout);

            /**
             * Add the temporary subscription which will be immediately cleared
             * by the handler function upon receiving the message
             */
            this.subscribe<T>(
                messageType,
                (message: MessageByType<T>) => {
                    clearTimeout(timeoutId);
                    this.removeIframeFromSubscription(messageType, iframe);
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
        subscriptionsToRemove.forEach((type) => {
            this.subscriptions.delete(type);
        });
    }

    /**
     * Clear all subscriptions
     */
    public clearAllSubscriptions(): void {
        this.subscriptions.clear();
    }

    /**
     * Remove subscription for an iframe
     */
    private removeIframeFromSubscription(messageType: MessageTypeEnum, iframe: Iframe): void {
        const subscription = this.subscriptions.get(messageType);
        if (!subscription) {
            throw new Error(`Subscription for '${messageType}' not found`);
        }

        const windowSource = this.extractWindowFromIframe(iframe);

        subscription.sources = subscription.sources.filter((source) => source !== windowSource);

        // Delete the subscription if it has no sources left
        if (subscription.sources.length === 0) {
            this.subscriptions.delete(messageType);
        }
    }

    /**
     * Set up the global message listener (called only once)
     */
    private setupMessageListener(): void {
        window.addEventListener('message', (event) => {
            try {
                // Validate that the message is properly formatted to filter out noise
                if (!event.data || typeof event.data !== 'object' || !event.data.name) {
                    return;
                }

                const message = event.data;

                // Find the matching subscriptions and call their handler
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
     * Extract the window source from the Iframe object
     */
    private extractWindowFromIframe(iframe: Iframe): Window {
        return iframe.getContentWindow();
    }
}
