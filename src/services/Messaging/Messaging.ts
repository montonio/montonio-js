import { MessageData, MessageTypeEnum } from './types';

export interface MessageSubscription {
    id: string;
    messageType: MessageTypeEnum;
    handler: (message: MessageData) => void;
    source?: Window;
}

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
     * Subscribe to messages of a specific type, optionally from a specific source
     * @param messageType The message type to listen for
     * @param handler Handler function to call when the message is received
     * @param source Optional specific iframe window to listen to
     * @returns Subscription ID that can be used to unsubscribe
     */
    public subscribe<T extends MessageData = MessageData>(
        messageType: MessageTypeEnum,
        handler: (message: T) => void,
        source?: Window,
    ): string {
        const subscriptionId = `sub_${++this.subscriptionCounter}`;

        this.subscriptions.set(subscriptionId, {
            id: subscriptionId,
            messageType,
            handler: handler as (message: MessageData) => void,
            source,
        });

        return subscriptionId;
    }

    /**
     * Unsubscribe from a message subscription
     * @param subscriptionId The subscription ID returned from subscribe()
     */
    public unsubscribe(subscriptionId: string): void {
        this.subscriptions.delete(subscriptionId);
    }

    /**
     * Wait for a specific message type, optionally from a specific source
     * @param messageType The message type to wait for
     * @param source Optional specific iframe window to listen to
     * @param timeout Timeout in milliseconds
     * @returns Promise that resolves when the message is received or rejects on timeout
     */
    public waitForMessage<T extends MessageData = MessageData>(
        messageType: MessageTypeEnum,
        source?: Window,
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
                source,
            );
        });
    }

    /**
     * Post a message to a specific iframe window
     * @param target The target iframe window
     * @param messageData The message data to send
     * @param targetOrigin The target origin (default: '*')
     */
    public postMessage(target: Window, messageData: MessageData, targetOrigin: string = '*'): void {
        if (!target) {
            throw new Error('Target window is not available.');
        }
        target.postMessage(messageData, targetOrigin);
    }

    /**
     * Clear all subscriptions for a specific source (useful when unmounting an iframe)
     * @param source The iframe window source to clear subscriptions for
     */
    public clearSubscriptionsForSource(source: Window): void {
        const subscriptionsToRemove: string[] = [];

        this.subscriptions.forEach((subscription) => {
            if (subscription.source === source) {
                subscriptionsToRemove.push(subscription.id);
            }
        });

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
     * Set up the global message listener (only once)
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

                    // If source is specified, check if it matches
                    if (subscription.source && subscription.source !== event.source) {
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
}
