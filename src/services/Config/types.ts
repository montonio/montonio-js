export interface EnvironmentVariables {
    stargateUrl: {
        sandbox: string;
        production: string;
        'prelive-sandbox': string;
        'prelive-production': string;
        development: string;
    };
}

export enum Environment {
    DEVELOPMENT = 'development',
    PRODUCTION = 'production',
    SANDBOX = 'sandbox',
    PRELIVE_SANDBOX = 'prelive-sandbox',
    PRELIVE_PRODUCTION = 'prelive-production',
}

export type EnvironmentOptions = Environment | `${Environment}`;
