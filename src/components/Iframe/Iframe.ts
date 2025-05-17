import { IframeOptions } from './types';

/**
 * Iframe component for rendering and communicating with iframes
 */
export class Iframe {
    private element: HTMLIFrameElement;
    private readonly defaultStyles: Partial<CSSStyleDeclaration> = {
        width: '100%',
        height: '100%',
        border: 'none',
        overflow: 'hidden',
    };

    /**
     * Create a new iframe
     * @param options Iframe options
     */
    constructor(private options: IframeOptions) {
        this.element = document.createElement('iframe');
        this.setupIframe();
    }

    /**
     * Setup the iframe with the provided options
     */
    private setupIframe(): void {
        const { src, allow = 'payment', styles = {} } = this.options;

        // Set iframe attributes
        this.element.src = src;
        this.element.allow = allow;

        // Apply styles
        const combinedStyles = { ...this.defaultStyles, ...styles };
        Object.assign(this.element.style, combinedStyles);
    }

    /**
     * Mount the iframe to the DOM
     * @returns The iframe element
     */
    public mount(): HTMLIFrameElement {
        // Clear the container first
        this.options.mountElement.innerHTML = '';

        // Append the iframe
        this.options.mountElement.appendChild(this.element);

        return this.element;
    }

    /**
     * Remove the iframe from the DOM
     */
    public unmount(): void {
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    /**
     * Get the iframe element
     * @returns The iframe element
     */
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
}
