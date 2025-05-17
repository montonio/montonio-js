import { MessageHandler, MessageOptions, MessagePayload } from './types';

/**
 * Messaging service for communication between parent window and iframes
 */
export class MessagingService {
    private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
    private listenerAttached = false;

    constructor() {
        this.setupMessageListener();
    }

    /**
     * Set up the global message listener
     */
    private setupMessageListener(): void {
        if (this.listenerAttached) return;

        window.addEventListener('message', (event) => {
            try {
                // Validate that the message is properly formatted
                if (!event.data || typeof event.data !== 'object' || !event.data.type) {
                    return;
                }

                const { type, payload } = event.data;
                const handlers = this.messageHandlers.get(type);

                if (handlers) {
                    handlers.forEach((handler) => handler(payload));
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        });

        this.listenerAttached = true;
    }

    /**
     * Send a message to a target window
     * @param targetWindow Window to send the message to (e.g., iframe.contentWindow)
     * @param type Message type
     * @param payload Message payload
     * @param options Message options
     */
    public sendMessage(
        targetWindow: Window,
        type: string,
        payload?: MessagePayload,
        options: MessageOptions = {},
    ): void {
        const { targetOrigin = '*' } = options;

        targetWindow.postMessage(
            {
                type,
                payload,
            },
            targetOrigin,
        );
    }

    /**
     * Listen for messages of a specific type
     * @param type Message type to listen for
     * @param handler Handler function to call when the message is received
     * @returns Cleanup function to remove the listener
     */
    public onMessage(type: string, handler: MessageHandler): () => void {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, new Set());
        }

        const handlers = this.messageHandlers.get(type)!;
        handlers.add(handler);

        // Return a cleanup function
        return () => {
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.messageHandlers.delete(type);
            }
        };
    }
}

export default MessagingService;
