import { MessageByType, Messages, MessageSubscription, MessageTypeEnum } from './types';
import { Iframe } from '../../components/Iframe/Iframe';

/**
 * Service for sending and receiving messages between iframes
 * Implemented as a singleton
 */
export class MessagingService {
    private static _instance: MessagingService;
    private subscriptions: Map<MessageTypeEnum, MessageSubscription> = new Map();
    // private globalListenerAttached = false;
    // private subscriptionCounter = 0;

    private constructor() {
        this.setupGlobalMessageListener();
    }

    public static get instance(): MessagingService {
        if (!MessagingService._instance) {
            MessagingService._instance = new MessagingService();
        }
        return MessagingService._instance;
    }

    /**
     * Subscribe to messages of a specific type from specific sources
     * @param messageType The message type to listen for
     * @param handler Handler function to call when the message is received
     * @param sources Array of specific iframe windows or Iframe objects to listen to
     * @returns Subscription ID that can be used to unsubscribe
     */
    public subscribe<T extends MessageTypeEnum>(
        messageType: T,
        handler: (message: MessageByType<T>) => void,
        sources: Window[] | Iframe[],
    ): void {
        if (this.subscriptions.has(messageType)) {
            throw new Error(`Subscription for '${messageType}' already exists`);
        }

        // Convert Iframe objects to Window objects
        const windowSources = this.extractWindowSources(sources);

        this.subscriptions.set(messageType, {
            handler: handler as (message: Messages) => void,
            sources: windowSources,
        });
    }

    /**
     * Add a source to an existing subscription
     */
    public addSourceToSubscription(messageType: MessageTypeEnum, source: Window): void {
        const subscription = this.subscriptions.get(messageType);
        if (!subscription) {
            throw new Error(`Subscription for '${messageType}' not found`);
        }

        if (!subscription.sources.includes(source)) {
            subscription.sources.push(source);
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
        sources: Window[] | Iframe[],
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
                sources,
            );
        });
    }

    /**
     * Post a message to a specific iframe window
     */
    public postMessage(target: Window, messageData: Messages, targetOrigin: string = '*'): void {
        if (!target) {
            throw new Error('Target window is not available.');
        }
        target.postMessage(messageData, targetOrigin);
    }

    /**
     * Clear all subscriptions for a specific source (useful when unmounting an iframe)
     */
    public clearSubscriptionsForSource(source: Window): void {
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
    private setupGlobalMessageListener(): void {
        // if (this.globalListenerAttached) return;

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

    private extractWindowSources(sources: Window[] | Iframe[]): Window[] {
        return sources
            .map((source) => {
                if (source instanceof Iframe) {
                    const contentWindow = source.getContentWindow();
                    if (!contentWindow) {
                        throw new Error(
                            'Iframe contentWindow is not available. Make sure the iframe is mounted and loaded.',
                        );
                    }
                    return contentWindow;
                }
                return source;
            })
            .filter((window): window is Window => window !== null);
    }
}
