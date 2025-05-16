import { CheckoutOptions } from './types';

export class MontonioCheckout {
    options: CheckoutOptions;

    constructor(options: CheckoutOptions) {
        this.options = options;
    }

    initialize(): this {
        console.log('Initializing Montonio Checkout with options:', this.options);
        return this;
    }
}
