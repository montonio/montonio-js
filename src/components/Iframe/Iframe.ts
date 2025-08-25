import { IframeOptions } from './types';
import { MessageTypeEnum } from '../../services/Messaging';
import { MessagingService } from '../../services';

/**
 * Iframe component for rendering and communicating with iframes
 */
export class Iframe {
    private readonly element: HTMLIFrameElement;
    private readonly options: IframeOptions;
    private readonly defaultStyles: Partial<CSSStyleDeclaration> = {
        border: 'none',
        display: 'block',
        width: '100%',
        height: '100%',
    };
    private readonly resizeOnHeightChange: boolean;
    private messagingService: MessagingService;

    constructor(options: IframeOptions) {
        this.options = options;
        this.resizeOnHeightChange = options.resizeOnHeightChange ?? true;
        this.element = document.createElement('iframe');
        this.messagingService = new MessagingService();
        this.setupIframe();
    }

    public mount(): HTMLIFrameElement {
        this.options.mountElement.appendChild(this.element);
        if (this.resizeOnHeightChange) {
            this.startResizing(this.element);
        }
        return this.element;
    }

    public unmount(): void {
        // This only clears the resize subscription because that's the only subscription
        // on the MessagingService created in this Iframe instance
        if (this.element.contentWindow) {
            this.messagingService.clearAllSubscriptions();
        }

        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    /**
     * Get the Window object of the iframe
     */
    public getContentWindow(): Window {
        if (!this.element.contentWindow) {
            throw new Error('Iframe contentWindow is not available. Make sure the iframe is mounted and loaded.');
        }
        return this.element.contentWindow;
    }

    /**
     * Listen to height change messages from the child window and change the height of the iframe element
     */
    private startResizing(element: HTMLIFrameElement) {
        this.messagingService.subscribe(
            MessageTypeEnum.CHECKOUT_HEIGHT_CHANGED,
            (message) => {
                element.style.height = message.payload.height + 'px';
            },
            this,
        );
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
}
