import { Iframe } from './Iframe/Iframe';
import { ConfigService, HTTPService, MessagingService } from '../services';

export abstract class BaseComponent {
    protected http: HTTPService;
    protected config: ConfigService;
    protected messaging: MessagingService;
    protected iframe: Iframe | null = null;
    protected mountElement: HTMLElement | null = null;
    public loaded: boolean = false;

    constructor() {
        this.http = HTTPService.getInstance();
        this.config = ConfigService.getInstance();
        this.messaging = MessagingService.getInstance();
    }

    public abstract initialize(...args: unknown[]): Promise<unknown>;

    public destroy(): void {
        this.cleanup();
    }

    public getIframe(): Iframe {
        if (!this.iframe) {
            throw new Error('Iframe not initialized');
        }
        return this.iframe;
    }

    protected cleanup(): void {
        if (this.iframe) {
            this.iframe.unmount();
            this.iframe = null;
        }
    }
}
