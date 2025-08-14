import { PaymentFailedMessageData } from '../../services/Messaging';

export enum ErrorEnum {
    MONTONIO_CHECKOUT_NOT_INITIALIZED = 'MONTONIO_CHECKOUT_NOT_INITIALIZED',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    PAYMENT_FAILED = 'PAYMENT_FAILED',
    FAILED_TO_FETCH_RETURN_URL = 'FAILED_TO_FETCH_RETURN_URL',
}

export class MontonioCheckoutNotInitializedError extends Error {
    constructor(
        message: string = 'MontonioCheckout not initialized. Please call the .initialize() method of the MontonioCheckout class first.',
    ) {
        super(message);
        this.name = ErrorEnum.MONTONIO_CHECKOUT_NOT_INITIALIZED;
    }
}

export class ValidationError extends Error {
    constructor(message: string = 'Validation failed. Check payment details and try again.') {
        super(message);
        this.name = ErrorEnum.VALIDATION_ERROR;
    }
}

export class PaymentFailedError extends Error {
    paymentFailedMessageData: PaymentFailedMessageData;

    constructor(paymentFailedMessageData: PaymentFailedMessageData) {
        super(`Payment failed: ${paymentFailedMessageData.errorCode}`);
        this.name = ErrorEnum.PAYMENT_FAILED;
        this.paymentFailedMessageData = paymentFailedMessageData;
    }
}

export class FailedToFetchReturnUrlError extends Error {
    constructor({ attempts }: { attempts: number }) {
        super(
            `Payment was successful but we failed to fetch the return-url from our servers after ${attempts} retries. 
            The customer should not try again! We will inform you about the payment being paid via webhook.`,
        );
        this.name = ErrorEnum.FAILED_TO_FETCH_RETURN_URL;
    }
}
