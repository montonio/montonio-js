import { MessageByType, Messages, MessageSubscription, MessageTypeEnum } from './types';
import { Iframe } from '../../components';
import { MontonioLogger } from '../Logging/Logging';

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
    private readonly logger = new MontonioLogger(this.constructor.name);
    private subscriptions: Map<MessageTypeEnum, MessageSubscription> = new Map();

    public constructor() {
        this.setupMessageListener();
    }

    /**
     * Subscribe to messages of a specific type from a specific source iframe.
     * @param messageType The message type to listen for.
     * @param handler Handler function to call when the message is received.
     * @param iframe Iframe object to listen to.
     * @returns Subscription ID that can be used to unsubscribe.
     */
    public subscribe<T extends MessageTypeEnum>(
        messageType: T,
        handler: (message: MessageByType<T>) => void,
        iframe: Iframe,
    ): void {
        if (this.subscriptions.has(messageType)) {
            throw new Error(`Subscription for '${messageType}' already exists`);
        }

        this.subscriptions.set(messageType, {
            handler: handler as (message: Messages) => void,
            sources: [iframe],
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

        if (!subscription.sources.includes(iframe)) {
            subscription.sources.push(iframe);
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
        timeout = 30000,
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
        const target = iframe.getContentWindow();
        target.postMessage(messageData, targetOrigin);
    }

    /**
     * Clear all subscriptions
     */
    public clearAllSubscriptions(): void {
        this.subscriptions.clear();
    }

    /**
     * Clear all subscriptions except the ones in the except array
     */
    public clearSubscriptionsExcept(except: MessageTypeEnum[]): void {
        for (const key of [...this.subscriptions.keys()]) {
            if (!except.includes(key)) {
                this.subscriptions.delete(key);
            }
        }
    }

    /**
     * Remove an iframe from a subscription's sources
     */
    public removeIframeFromSubscription(messageType: MessageTypeEnum, iframe: Iframe): void {
        const subscription = this.subscriptions.get(messageType);
        if (!subscription) {
            throw new Error(`Subscription for '${messageType}' not found`);
        }

        subscription.sources = subscription.sources.filter((source) => source !== iframe);

        // Delete the subscription if it has no sources left
        if (subscription.sources.length === 0) {
            this.subscriptions.delete(messageType);
        }
    }

    /**
     * Set up the message listener for capturing all window messages
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

                    // Check if the event source matches any of the specified sources.
                    // contentWindow is resolved lazily here — the iframe must be loaded
                    // to have sent a message, so getContentWindow() is safe at this point.
                    const sourceMatches = subscription.sources.some((source) => {
                        try {
                            return source.getContentWindow() === event.source;
                        } catch (error) {
                            console.error(
                                'MONTONIO-JS: MessagingService: Failed to resolve contentWindow for source:',
                                error,
                            );
                            return false;
                        }
                    });
                    if (!sourceMatches) {
                        return;
                    }

                    // Call the handler
                    try {
                        subscription.handler(message);
                    } catch (error) {
                        this.logger.error('Error in message handler', { error });
                    }
                });
            } catch (error) {
                this.logger.error('Error processing iframe message', { error });
            }
        });
    }
}
