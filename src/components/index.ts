import { CheckoutOptions } from './MontonioCheckout/types';
import { MontonioCheckout } from './MontonioCheckout/MontonioCheckout';

/**
 * Load the Montonio Checkout
 * @param options Configuration options
 * @returns MontonioCheckout instance
 */
export async function loadMontonioCheckout(options: CheckoutOptions): Promise<MontonioCheckout> {
    const checkout = new MontonioCheckout(options);
    return await checkout.initialize();
}
