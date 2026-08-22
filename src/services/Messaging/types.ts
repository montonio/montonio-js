import { ActionRequiredActionEnum, LocaleEnum } from '../../components/MontonioCheckout/types';
import type { Iframe } from '../../components';

export interface MessageSubscription {
    handler: (message: Messages) => void;
    sources: Iframe[];
}

export interface MessageOptions {
    targetOrigin?: string;
}

export enum MessageTypeEnum {
    CHECKOUT_PAYMENT_COMPONENT_READY = 'montonio:checkout.paymentComponentReady',
    CHECKOUT_CHANGE_LOCALE = 'montonio:checkout.changeLocale',
    CHECKOUT_SUBMIT_PAYMENT = 'montonio:checkout.submitPayment',
    CHECKOUT_START_PAYMENT_AUTH = 'montonio:checkout.startPaymentAuth',
    CHECKOUT_SEND_PAYMENT_AUTH_DATA = 'montonio:checkout.sendPaymentAuthData',
    CHECKOUT_PAYMENT_AUTH_COMPONENT_READY = 'montonio:checkout.paymentAuthComponentReady',
    CHECKOUT_PAYMENT_AUTH_COMPLETED = 'montonio:checkout.paymentAuthCompleted',
    CHECKOUT_PAYMENT_COMPLETED = 'montonio:checkout.paymentCompleted',
    CHECKOUT_PAYMENT_FAILED = 'montonio:checkout.paymentFailed',
    CHECKOUT_SEND_PAYMENT_FAILED_DATA = 'montonio:checkout.sendPaymentFailedData',
    CHECKOUT_HEIGHT_CHANGED = 'montonio:checkout.heightChanged',
    CHECKOUT_VALIDATE_FIELDS = 'montonio:checkout.validateFields',
    CHECKOUT_VALIDATE_FIELDS_RESULT = 'montonio:checkout.validateFieldsResult',
    CHECKOUT_PAYMENT_FORM_CHANGED = 'montonio:checkout.paymentFormChanged',
    CHECKOUT_REDIRECT = 'montonio:checkout.redirect',
    CHECKOUT_ACTION_REQUIRED = 'montonio:checkout.actionRequired',
}

export type Messages =
    | {
          name: MessageTypeEnum.CHECKOUT_PAYMENT_COMPONENT_READY;
      }
    | {
          name: MessageTypeEnum.CHECKOUT_CHANGE_LOCALE;
          payload: {
              locale: LocaleEnum;
          };
      }
    | {
          name: MessageTypeEnum.CHECKOUT_SUBMIT_PAYMENT;
      }
    | {
          name: MessageTypeEnum.CHECKOUT_START_PAYMENT_AUTH;
          payload: {
              paymentAuthData: PaymentAuthMessageData;
          };
      }
    | {
          name: MessageTypeEnum.CHECKOUT_SEND_PAYMENT_AUTH_DATA;
          payload: {
              paymentAuthData: PaymentAuthMessageData;
          };
      }
    | {
          name: MessageTypeEnum.CHECKOUT_PAYMENT_AUTH_COMPONENT_READY;
      }
    | {
          name: MessageTypeEnum.CHECKOUT_PAYMENT_AUTH_COMPLETED;
          payload: unknown;
      }
    | {
          name: MessageTypeEnum.CHECKOUT_PAYMENT_COMPLETED;
          payload: {
              paymentIntentUuid: string;
              resultCode: string;
              returnUrl?: string;
          };
      }
    | {
          name: MessageTypeEnum.CHECKOUT_PAYMENT_FAILED;
          payload: PaymentFailedMessageData;
      }
    | {
          name: MessageTypeEnum.CHECKOUT_SEND_PAYMENT_FAILED_DATA;
          payload: PaymentFailedMessageData;
      }
    | {
          name: MessageTypeEnum.CHECKOUT_HEIGHT_CHANGED;
          payload: {
              height: number;
          };
      }
    | {
          name: MessageTypeEnum.CHECKOUT_VALIDATE_FIELDS;
      }
    | {
          name: MessageTypeEnum.CHECKOUT_VALIDATE_FIELDS_RESULT;
          payload: {
              isValid: boolean;
          };
      }
    | {
          name: MessageTypeEnum.CHECKOUT_PAYMENT_FORM_CHANGED;
          payload: {
              isValid: boolean;
          };
      }
    | {
          name: MessageTypeEnum.CHECKOUT_REDIRECT;
          payload: {
              redirectUrl: string;
          };
      }
    | {
          name: MessageTypeEnum.CHECKOUT_ACTION_REQUIRED;
          payload: {
              action: ActionRequiredActionEnum;
          };
      };

// Utility type to extract the specific message type based on the MessageTypeEnum
export type MessageByType<T extends MessageTypeEnum> = Extract<Messages, { name: T }>;

export interface PaymentAuthMessageData {
    type: 'redirect' | 'embedded';
    embeddedUrl?: string;
    redirectUrl?: string;
    redirectMethod?: string;
    formData?: Record<string, string>;
    originalPaymentMethodData?: unknown;
}

/**
 * Coarse category for a failed card payment. Matches the message shown to the shopper —
 * exposes no more detail than the shopper already sees.
 */
export enum DeclineCategoryEnum {
    CARD_NOT_USABLE = 'card_not_usable',
    INSUFFICIENT_FUNDS = 'insufficient_funds',
    VERIFICATION_FAILED = 'verification_failed',
    BANK_DECLINED = 'bank_declined',
    CARD_DETAILS_INVALID = 'card_details_invalid',
    TEMPORARY_PROBLEM = 'temporary_problem',
    /** Fallback when the refusal could not be classified further. */
    OTHER = 'other',
}

export interface PaymentFailedMessageData {
    errorCode: string;
    declineCategory?: DeclineCategoryEnum;
    paymentIntentUuid?: string;
    originalPaymentMethodResult?: unknown;
}
