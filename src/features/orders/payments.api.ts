import { apiClient } from '../../infrastructure/http/axios.client';

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'pos' | 'other';
export type PaymentIntent = 'deposit' | 'installment' | 'final' | 'full_upfront';

export interface PaymentRecord {
  id: string;
  amount: number; // kobo
  paymentMethod: PaymentMethod;
  paymentIntent: PaymentIntent;
  notes: string | null;
  createdAt: string;
}

export interface PaymentSummary {
  totalAgreed: number | null; // kobo; null when no total price is set
  totalPaid: number; // kobo
  outstandingBalance: number; // kobo
  records: PaymentRecord[];
}

export interface RecordPaymentRequest {
  amount: number; // kobo
  payment_method: PaymentMethod;
  payment_intent: PaymentIntent;
  notes?: string;
}

export const paymentsApi = {
  getSummary: async (orderId: string): Promise<PaymentSummary> => {
    const { data } = await apiClient.get<PaymentSummary>(`/orders/${orderId}/payments/summary`);
    return data;
  },

  recordPayment: async (orderId: string, body: RecordPaymentRequest): Promise<PaymentRecord> => {
    const { data } = await apiClient.post<PaymentRecord>(`/orders/${orderId}/payments`, body);
    return data;
  },
};

// Kobo and naira conversion lives only here
export const kobotoNaira = (kobo: number): number => kobo / 100;
export const nairaToKobo = (naira: number): number => Math.round(naira * 100);
export const formatNaira = (kobo: number): string =>
  `₦${kobotoNaira(kobo).toLocaleString('en-NG')}`;
