import { CheckoutOptions } from './checkout/types';
import { MontonioCheckout } from './checkout/checkout';

/**
 * Load the Montonio Checkout
 * @param options Configuration options
 * @returns MontonioCheckout instance
 */
export async function loadMontonioCheckout(options: CheckoutOptions): Promise<MontonioCheckout> {
    const checkout = new MontonioCheckout(options);
    return await checkout.initialize();
}
