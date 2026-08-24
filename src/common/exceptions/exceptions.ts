import { PaymentFailedMessageData } from '../../services/Messaging';

export enum ErrorEnum {
    MONTONIO_CHECKOUT_NOT_INITIALIZED = 'MONTONIO_CHECKOUT_NOT_INITIALIZED',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    CHECKOUT_OPTIONS_VALIDATION_ERROR = 'CHECKOUT_OPTIONS_VALIDATION_ERROR',
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
    displayedInPaymentComponent: boolean = true;

    constructor(message: string = 'Validation failed. Check payment details and try again.') {
        super(message);
        this.name = ErrorEnum.VALIDATION_ERROR;
    }
}

export class PaymentFailedError extends Error {
    paymentFailedMessageData: PaymentFailedMessageData;
    displayedInPaymentComponent: boolean = true;

    constructor(paymentFailedMessageData: PaymentFailedMessageData) {
        const original = paymentFailedMessageData.originalPaymentMethodResult as { message?: unknown } | undefined;
        const detail = typeof original?.message === 'string' ? ` — ${original.message}` : '';
        super(`Payment failed: ${paymentFailedMessageData.errorCode}${detail}`);
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

export class CheckoutOptionsValidationError extends Error {
    constructor(errors: string[]) {
        const errorList = errors.map((error, index) => `  ${index + 1}. ${error}`).join('\n');
        super(`Invalid CheckoutOptions provided:\n${errorList}\n\nPlease fix these validation errors and try again.`);
        this.name = ErrorEnum.CHECKOUT_OPTIONS_VALIDATION_ERROR;
    }
}
