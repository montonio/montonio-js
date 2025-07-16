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
    /** @internal */
    DEVELOPMENT = 'development',
    PRODUCTION = 'production',
    SANDBOX = 'sandbox',
    /** @internal */
    PRELIVE_SANDBOX = 'prelive-sandbox',
    /** @internal */
    PRELIVE_PRODUCTION = 'prelive-production',
}

export type EnvironmentOptions = Environment | `${Environment}`;
