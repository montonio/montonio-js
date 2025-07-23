import { Iframe } from './Iframe/Iframe';
import { ConfigService, HTTPService, MessagingService } from '../services';

export abstract class BaseComponent {
    protected http: HTTPService;
    protected config: ConfigService;
    protected messaging: MessagingService;
    protected mountElement: HTMLElement | null = null;
    protected loaded: boolean = false;

    private _iframe: Iframe | null = null;

    protected constructor() {
        this.http = HTTPService.getInstance();
        this.config = ConfigService.getInstance();
        this.messaging = MessagingService.getInstance();
    }

    public abstract initialize(...args: unknown[]): Promise<unknown>;

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
}
