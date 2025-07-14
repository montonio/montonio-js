import { MessageData, MessageSubscription, MessageTypeEnum } from './types';
import { Iframe } from '../../components/Iframe/Iframe';

/**
 * Service for sending and receiving messages between iframes
 * Implemented as a singleton
 */
export class MessagingService {
    private static instance: MessagingService;
    private subscriptions: Map<string, MessageSubscription> = new Map();
    private globalListenerAttached = false;
    private subscriptionCounter = 0;

    private constructor() {
        this.setupGlobalMessageListener();
    }

    public static getInstance(): MessagingService {
        if (!MessagingService.instance) {
            MessagingService.instance = new MessagingService();
        }
        return MessagingService.instance;
    }

    /**
     * Subscribe to messages of a specific type from specific sources
     * @param messageType The message type to listen for
     * @param handler Handler function to call when the message is received
     * @param sources Array of specific iframe windows or Iframe objects to listen to
     * @returns Subscription ID that can be used to unsubscribe
     */
    public subscribe<T extends MessageData = MessageData>(
        messageType: MessageTypeEnum,
        handler: (message: T) => void,
        sources: Window[] | Iframe[],
    ): string {
        const subscriptionId = `sub_${++this.subscriptionCounter}`;

        // Convert Iframe objects to Window objects
        const windowSources = this.extractWindowSources(sources);

        this.subscriptions.set(subscriptionId, {
            id: subscriptionId,
            messageType,
            handler: handler as (message: MessageData) => void,
            sources: windowSources,
        });

        return subscriptionId;
    }

    /**
     * Add a source to an existing subscription
     */
    public addSourceToSubscription(subscriptionId: string, source: Window): boolean {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription) {
            throw new Error(`Subscription with ID '${subscriptionId}' not found`);
        }

        // Check if source already exists
        if (subscription.sources.includes(source)) {
            return false;
        }

        // Add the source
        subscription.sources.push(source);
        return true;
    }

    public unsubscribe(subscriptionId: string): void {
        this.subscriptions.delete(subscriptionId);
    }

    /**
     * Wait for a specific message type from specific sources
     * @param messageType The message type to wait for
     * @param sources Array of specific iframe windows or Iframe objects to listen to
     * @param timeout Timeout in milliseconds
     * @returns Promise that resolves when the message is received or rejects on timeout
     */
    public waitForMessage<T extends MessageData = MessageData>(
        messageType: MessageTypeEnum,
        sources: Window[] | Iframe[],
        timeout = 10000,
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.unsubscribe(subscriptionId);
                reject(new Error(`Message ${messageType} timeout after ${timeout}ms`));
            }, timeout);

            const subscriptionId = this.subscribe<T>(
                messageType,
                (message: T) => {
                    clearTimeout(timeoutId);
                    this.unsubscribe(subscriptionId);
                    resolve(message);
                },
                sources,
            );
        });
    }

    /**
     * Post a message to a specific iframe window
     */
    public postMessage(target: Window, messageData: MessageData, targetOrigin: string = '*'): void {
        if (!target) {
            throw new Error('Target window is not available.');
        }
        target.postMessage(messageData, targetOrigin);
    }

    /**
     * Clear all subscriptions for a specific source (useful when unmounting an iframe)
     */
    public clearSubscriptionsForSource(source: Window): void {
        const subscriptionsToRemove: string[] = [];

        this.subscriptions.forEach((subscription) => {
            if (subscription.sources.includes(source)) {
                // Remove the specific source from the subscription
                subscription.sources = subscription.sources.filter((s) => s !== source);

                // If no sources left, mark subscription for removal
                if (subscription.sources.length === 0) {
                    subscriptionsToRemove.push(subscription.id);
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
        if (this.globalListenerAttached) return;

        window.addEventListener('message', (event) => {
            try {
                // Validate that the message is properly formatted
                if (!event.data || typeof event.data !== 'object' || !event.data.name) {
                    return;
                }

                const message = event.data as MessageData;

                // Find all matching subscriptions
                this.subscriptions.forEach((subscription) => {
                    // Check if message type matches
                    if (subscription.messageType !== message.name) {
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

        this.globalListenerAttached = true;
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
