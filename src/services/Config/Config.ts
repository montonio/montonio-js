import { EnvironmentOptions, EnvironmentVariables } from './types';

/**
 * Returns environment variables from the .env file
 * Implemented as a singleton
 */
export class ConfigService {
    private static _instance: ConfigService;
    private readonly environmentVariables: EnvironmentVariables;

    private constructor() {
        this.environmentVariables = {
            stargateUrl: {
                sandbox: import.meta.env.VITE_STARGATE_LIVE_SANDBOX_URL,
                production: import.meta.env.VITE_STARGATE_LIVE_PRODUCTION_URL,
                'prelive-sandbox': import.meta.env.VITE_STARGATE_PRELIVE_SANDBOX_URL,
                'prelive-production': import.meta.env.VITE_STARGATE_PRELIVE_PRODUCTION_URL,
                development: import.meta.env.VITE_STARGATE_DEVELOPMENT_URL,
            },
            datadogClientToken: import.meta.env.VITE_DATADOG_CLIENT_TOKEN,
        };
    }

    public static get instance(): ConfigService {
        if (!ConfigService._instance) {
            ConfigService._instance = new ConfigService();
        }
        return ConfigService._instance;
    }

    public getConfig(name: keyof EnvironmentVariables, environment?: EnvironmentOptions): string {
        const config = this.environmentVariables[name];
        if (typeof config === 'string') {
            return config;
        }
        if (!environment) {
            throw new Error(`Environment parameter required for config key: ${name}`);
        }
        return config[environment];
    }
}

export default ConfigService;
