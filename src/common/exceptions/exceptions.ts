import { PaymentFailedMessageData } from '../../services/Messaging';

export class MontonioCheckoutNotInitializedError extends Error {
    constructor(
        message: string = 'MontonioCheckout not initialized. Please call the .initialize() method of the MontonioCheckout class first.',
    ) {
        super(message);
        this.name = 'MontonioCheckoutNotInitializedError';
    }
}

export class PaymentAuthNotInitializedError extends Error {
    constructor(
        message: string = 'PaymentAuth not initialized. Please call the .initialize() method of the PaymentAuth class first.',
    ) {
        super(message);
        this.name = 'PaymentAuthNotInitializedError';
    }
}

export class ValidationError extends Error {
    constructor(message: string = 'Validation failed. Check payment details and try again.') {
        super(message);
        this.name = 'ValidationError';
    }
}

export class PaymentFailedError extends Error {
    paymentFailedMessageData: PaymentFailedMessageData;

    constructor(paymentFailedMessageData: PaymentFailedMessageData) {
        super(`Payment failed: ${paymentFailedMessageData.errorCode}`);
        this.name = 'PaymentFailedError';
        this.paymentFailedMessageData = paymentFailedMessageData;
    }
}
