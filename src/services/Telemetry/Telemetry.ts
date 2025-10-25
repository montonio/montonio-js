import { datadogLogs } from '@datadog/browser-logs';
import { Environment } from '../Config/types';

/**
 * Service for initializing telemetry and logging
 * Implemented as a singleton
 */
export class TelemetryService {
    private static _instance: TelemetryService;
    private initialized = false;

    private constructor() {}

    public static get instance(): TelemetryService {
        if (!TelemetryService._instance) {
            TelemetryService._instance = new TelemetryService();
        }
        return TelemetryService._instance;
    }

    /**
     * Initialize Datadog logging with the given environment and session UUID
     * If already initialized, updates the session UUID using setGlobalContextProperty
     * @param environment The environment (production or sandbox)
     * @param sessionUuid The session UUID to include in the global context
     */
    public initialize(environment: string, sessionUuid: string): void {
        if (this.initialized) {
            // If already initialized, just update the sessionUuid
            try {
                datadogLogs.setGlobalContextProperty('sessionUuid', sessionUuid);
            } catch (error) {
                console.error('MONTONIO-JS: TelemetryService: Error updating sessionUuid:', error);
            }
            return;
        }

        try {
            datadogLogs.init({
                clientToken: 'pubb5b1ffe19aeb16a90d1181fd3e866b83',
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
            console.error('MONTONIO-JS: TelemetryService: Error initializing Datadog Logs:', error);
        }
    }
}

export default TelemetryService;
