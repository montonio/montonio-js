import { Environment, EnvironmentVariables } from './types';

/**
 * Returns environment variables from the .env file
 * Singleton service
 */
export class ConfigService {
    private static instance: ConfigService;
    private environmentVariables: EnvironmentVariables;

    private constructor() {
        this.environmentVariables = {
            stargateUrl: {
                sandbox: import.meta.env.VITE_STARGATE_LIVE_SANDBOX_URL,
                production: import.meta.env.VITE_STARGATE_LIVE_PRODUCTION_URL,
                'prelive-sandbox': import.meta.env.VITE_STARGATE_PRELIVE_SANDBOX_URL,
                'prelive-production': import.meta.env.VITE_STARGATE_PRELIVE_PRODUCTION_URL,
                development: import.meta.env.VITE_STARGATE_DEVELOPMENT_URL,
            },
        };
    }

    public static getInstance(): ConfigService {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }

    public getConfig(name: keyof EnvironmentVariables, environment: Environment): string {
        return this.environmentVariables[name][environment];
    }
}

export default ConfigService;
