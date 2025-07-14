import { PaymentAuthMessageData } from '../../services/Messaging/types';

export interface PaymentAuthOptions {
    paymentAuthData: PaymentAuthMessageData;
    mountElement?: HTMLElement;
}
