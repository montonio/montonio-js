import { Environment, EnvironmentVariables } from './types';

/**
 * Returns environment variables from the .env file
 * Singleton service
 */
export class ConfigService {
    private static instance: ConfigService;
    private environmentVariables: EnvironmentVariables = {
        stargateUrl: {
            sandbox: import.meta.env.VITE_STARGATE_SANDBOX_URL,
            production: import.meta.env.VITE_STARGATE_PRODUCTION_URL,
        },
    };

    private constructor() {}

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
