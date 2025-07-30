import { Iframe } from './';
import { ConfigService, HTTPService, MessagingService } from '../services';

export abstract class BaseComponent {
    protected httpService: HTTPService;
    protected configService: ConfigService;
    protected messagingService: MessagingService;
    protected mountElement: HTMLElement | null = null;
    protected loaded: boolean = false;
    private _iframe: Iframe | null = null;

    protected constructor() {
        // Create new instance of MessagingService for each component to clearly separate message subscriptions
        this.messagingService = new MessagingService();

        // Singleton instances of HTTP and Config services
        this.httpService = HTTPService.instance;
        this.configService = ConfigService.instance;
    }

    public get iframe(): Iframe {
        if (!this._iframe) {
            throw new Error('Iframe not initialized');
        }
        return this._iframe;
    }

    protected set iframe(value: Iframe | null) {
        this._iframe = value;
    }

    public cleanup(): void {
        if (this.iframe) {
            this.iframe.unmount();
            this.iframe = null;
        }
    }

    public abstract initialize(...args: unknown[]): Promise<unknown>;
}
