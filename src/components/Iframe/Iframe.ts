import { IframeOptions, MessageData, MessageTypeEnum } from './types';

/**
 * Iframe component for rendering and communicating with iframes
 */
export class Iframe {
    private element: HTMLIFrameElement;
    private readonly defaultStyles: Partial<CSSStyleDeclaration> = {
        width: '100%',
        height: '100%',
    };
    private messageHandlers: Map<MessageTypeEnum, Set<(message: MessageData) => void>> = new Map();
    private globalListenerAttached = false;

    constructor(private options: IframeOptions) {
        this.element = document.createElement('iframe');
        this.setupIframe();
        this.setupMessageListener();
    }

    private setupIframe(): void {
        const { src, queryParams, allow = 'payment', styles = {} } = this.options;

        // Set iframe attributes
        this.element.src = src;

        if (queryParams) {
            this.element.src += `?${new URLSearchParams(queryParams).toString()}`;
        }

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
        // Clear all message handlers when unmounting
        this.messageHandlers.clear();

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
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error(`Message ${messageType} timeout after ${timeout}ms`));
            }, timeout);

            const cleanup = this.subscribe<T>(messageType, (message: T) => {
                clearTimeout(timeoutId);
                cleanup();
                resolve(message);
            });
        });
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
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, new Set());
        }

        const handlers = this.messageHandlers.get(messageType)!;
        handlers.add(handler as (message: MessageData) => void);

        // Return a cleanup function
        return () => {
            handlers.delete(handler as (message: MessageData) => void);
            if (handlers.size === 0) {
                this.messageHandlers.delete(messageType);
            }
        };
    }

    /**
     * Post a message to the child iframe
     */
    public postMessage(messageData: MessageData, targetOrigin: string = '*'): void {
        if (!this.element.contentWindow) {
            throw new Error('Iframe is not available. Make sure the iframe is mounted and loaded.');
        }

        this.element.contentWindow.postMessage(messageData, targetOrigin);
    }

    /**
     * Set up the message listener for this iframe instance
     */
    private setupMessageListener(): void {
        if (this.globalListenerAttached) return;

        window.addEventListener('message', (event) => {
            try {
                // Only process messages from this iframe's content window
                if (event.source !== this.element.contentWindow) {
                    return;
                }

                // Validate that the message is properly formatted
                if (!event.data || typeof event.data !== 'object' || !event.data.name) {
                    return;
                }

                const message = event.data as MessageData;
                const handlers = this.messageHandlers.get(message.name);

                if (handlers) {
                    handlers.forEach((handler) => handler(message));
                }
            } catch (error) {
                console.error('Error processing iframe message:', error);
            }
        });

        this.globalListenerAttached = true;
    }
}
