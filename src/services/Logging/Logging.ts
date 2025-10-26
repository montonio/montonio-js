import { datadogLogs } from '@datadog/browser-logs';
import { Environment, EnvironmentOptions } from '../Config/types';
import { ConfigService } from '../Config/Config';

/**
 * Service for initializing telemetry and logging
 * Implemented as a singleton
 */
export class LoggingService {
    private static _instance: LoggingService;
    private initialized = false;
    private readonly configService: ConfigService;

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
            // If already initialized, just update the sessionUuid
            try {
                datadogLogs.setGlobalContextProperty('sessionUuid', sessionUuid);
                console.log('MONTONIO-JS: LoggingService: Session UUID updated:', sessionUuid);
            } catch (error) {
                console.error('MONTONIO-JS: LoggingService: Error updating sessionUuid:', error);
            }
            return;
        }

        try {
            const clientToken = this.configService.getConfig('datadogClientToken');
            datadogLogs.init({
                clientToken: clientToken,
                site: 'datadoghq.eu',
                env: environment === Environment.PRODUCTION ? 'live-production' : 'live-sandbox',
                forwardErrorsToLogs: true,
                service: 'montonio-js',
                version: __MONTONIO_JS_VERSION__,
                silentMultipleInit: true,
                forwardConsoleLogs: 'all',
            });
            datadogLogs.setGlobalContext({
                sessionUuid: sessionUuid,
            });
            this.initialized = true;
        } catch (error) {
            console.error('MONTONIO-JS: LoggingService: Error initializing Datadog Logs:', error);
        }
    }
}

export default LoggingService;
