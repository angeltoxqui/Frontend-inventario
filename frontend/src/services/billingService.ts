import { api } from '../lib/axios';
import type { PaymentDTO } from '../types/api';
import type { OrderBillingDetails } from '../types/models';

export const billingService = {
  payOrder: async (ordenId: number, paymentData: PaymentDTO) => {
    // Determine endpoint based on billing type as per guide
    const url = paymentData.factura_electronica
      ? `/api/v1/billing/orders/${ordenId}/pay`
      : `/api/v1/cashier/pay/${ordenId}`;

    const { data } = await api.post(url, paymentData);
    return data;
  },

  getOrderBillingDetails: async (ordenId: number): Promise<OrderBillingDetails> => {
    // Not explicitly in guide, assuming legacy or extra endpoint. 
    // If it fails, we might need to fetch /orders/{id} instead.
    const { data } = await api.get<OrderBillingDetails>(`/api/v1/billing/${ordenId}`);
    return data;
  },
};