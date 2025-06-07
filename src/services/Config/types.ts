export interface EnvironmentVariables {
    stargateUrl: {
        sandbox: string;
        production: string;
    };
}

export type Environment = 'sandbox' | 'production';
