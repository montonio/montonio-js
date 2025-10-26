import { CheckoutOptions, LocaleEnum, UpdatableCheckoutOptions } from '../../components/MontonioCheckout/types';
import { Environment } from '../../services/Config/types';
import { CheckoutOptionsValidationError } from '../../common/exceptions/exceptions';

/**
 * UUID regex pattern for validation
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates CheckoutOptions and throws CheckoutOptionsValidationError if validation fails.
 * Collects all validation errors before throwing.
 */
export function validateCheckoutOptions(options: CheckoutOptions): void {
    const errors: string[] = [];

    if (!options) {
        throw new CheckoutOptionsValidationError(['CheckoutOptions object is required']);
    }

    // Validate sessionUuid
    if (options.sessionUuid === undefined || options.sessionUuid === null) {
        errors.push('sessionUuid is required');
    } else if (typeof options.sessionUuid !== 'string') {
        errors.push('sessionUuid must be a string');
    } else if (!UUID_PATTERN.test(options.sessionUuid)) {
        errors.push(`sessionUuid must be a valid UUID format. Received: '${options.sessionUuid}'`);
    }

    // Validate onSuccess callback
    if (!options.onSuccess) {
        errors.push('onSuccess callback is required');
    } else if (typeof options.onSuccess !== 'function') {
        errors.push('onSuccess must be a function');
    }

    // Validate onError callback
    if (!options.onError) {
        errors.push('onError callback is required');
    } else if (typeof options.onError !== 'function') {
        errors.push('onError must be a function');
    }

    // Validate locale (optional)
    if (options.locale !== undefined && options.locale !== null) {
        const validLocales = Object.values(LocaleEnum);
        if (!validLocales.includes(options.locale)) {
            errors.push(`locale must be one of: ${validLocales.join(', ')}. Received: '${options.locale}'`);
        }
    }

    // Validate environment (optional)
    if (options.environment !== undefined && options.environment !== null) {
        const validEnvironments = Object.values(Environment);
        if (!validEnvironments.includes(options.environment as Environment)) {
            errors.push(`environment must be one of: production, sandbox. Received: '${options.environment}'`);
        }
    }

    // Throw if there are any validation errors
    if (errors.length > 0) {
        throw new CheckoutOptionsValidationError(errors);
    }
}

/**
 * Validates UpdatableCheckoutOptions and throws CheckoutOptionsValidationError if validation fails.
 * Collects all validation errors before throwing.
 */
export function validateUpdatableCheckoutOptions(options: UpdatableCheckoutOptions): void {
    const errors: string[] = [];

    if (!options) {
        throw new CheckoutOptionsValidationError(['UpdatableCheckoutOptions object is required']);
    }

    // Validate locale (optional)
    if (options.locale !== undefined && options.locale !== null) {
        const validLocales = Object.values(LocaleEnum);
        if (!validLocales.includes(options.locale)) {
            errors.push(`locale must be one of: ${validLocales.join(', ')}. Received: '${options.locale}'`);
        }
    }

    // Throw if there are any validation errors
    if (errors.length > 0) {
        throw new CheckoutOptionsValidationError(errors);
    }
}
