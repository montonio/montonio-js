import { datadogLogs } from '@datadog/browser-logs';
import { Environment, EnvironmentOptions } from '../Config/types';
import { ConfigService } from '../Config/Config';

/**
 * Thin logger wrapper that writes to both console and Datadog explicitly.
 * Datadog does NOT forward console logs — only calls through this logger reach Datadog.
 *
 * Usage: private readonly logger = new MontonioLogger('ClassName');
 */
export class MontonioLogger {
    private readonly logPrefix = 'MONTONIO-JS';
    constructor(private readonly context: string) {}

    info(message: string, data?: object): void {
        console.log(`${this.logPrefix} - ${this.context}: ${message}`, ...(data ? [data] : []));
        datadogLogs.logger.info(message, { context: this.context, ...data });
    }

    warn(message: string, data?: object): void {
        console.warn(`${this.logPrefix} - ${this.context}: ${message}`, ...(data ? [data] : []));
        datadogLogs.logger.warn(message, { context: this.context, ...data });
    }

    error(message: string, error: unknown, data?: object): void {
        console.error(`${this.logPrefix} - ${this.context}: ${message}`, error);
        datadogLogs.logger.error(
            message,
            { context: this.context, ...data },
            error instanceof Error ? error : undefined,
        );
    }
}

/**
 * Service for initializing telemetry and logging
 * Implemented as a singleton
 */
export class LoggingService {
    private static _instance: LoggingService;
    private initialized = false;
    private readonly configService: ConfigService;
    private readonly logger = new MontonioLogger('LoggingService');

    private constructor() {
        this.configService = ConfigService.instance;
    }

    public static get instance(): LoggingService {
        if (!LoggingService._instance) {
            LoggingService._instance = new LoggingService();
        }
        return LoggingService._instance;
    }

    /**
     * Initialize Datadog logging with the given environment and session UUID
     * If already initialized, updates the session UUID using setGlobalContextProperty
     * @param environment The environment (production or sandbox)
     * @param sessionUuid The session UUID to include in the global context
     */
    public initialize(environment: EnvironmentOptions, sessionUuid: string): void {
        if (this.initialized) {
            try {
                datadogLogs.setGlobalContextProperty('sessionUuid', sessionUuid);
                this.logger.info(`Updated sessionUuid to [${sessionUuid}]`, { sessionUuid });
            } catch (error) {
                this.logger.error(`Error updating sessionUuid to [${sessionUuid}]`, error);
            }
            return;
        }

        try {
            const clientToken = this.configService.getConfig('datadogClientToken');
            datadogLogs.init({
                clientToken: clientToken,
                site: 'datadoghq.eu',
                env: environment === Environment.PRODUCTION ? 'live-production' : 'live-sandbox',
                service: 'montonio-js',
                version: __MONTONIO_JS_VERSION__,
                silentMultipleInit: true,
                forwardErrorsToLogs: false,
                forwardConsoleLogs: [],
            });
            datadogLogs.setGlobalContext({
                sessionUuid: sessionUuid,
            });
            this.logger.info(`Set sessionUuid to [${sessionUuid}]`, { sessionUuid });
            this.initialized = true;
        } catch (error) {
            // datadogLogs is not yet available, fall back to console
            console.error('Error initializing Datadog logs', error);
        }
    }
}

export default LoggingService;
