export interface EnvironmentVariables {
    stargateUrl: {
        sandbox: string;
        production: string;
        'prelive-sandbox': string;
        'prelive-production': string;
        development: string;
    };
}

export type Environment = 'sandbox' | 'production' | 'prelive-sandbox' | 'prelive-production' | 'development';
