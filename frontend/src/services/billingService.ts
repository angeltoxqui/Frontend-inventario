import { api } from '../lib/axios';
import type { PaymentDTO } from '../types/api';
import type { OrderBillingDetails } from '../types/models';

export const billingService = {
  payOrder: async (ordenId: number, paymentData: PaymentDTO) => {
    // Endpoint 44 para facturación electrónica
    // Endpoint 40 para cajero simple (cashier)

    const url = paymentData.factura_electronica
      ? `/api/v1/billing/orders/${ordenId}/pay`
      : `/api/v1/cashier/pay/${ordenId}`;

    const { data } = await api.post(url, paymentData);
    return data;
  },

  getOrderBillingDetails: async (ordenId: number): Promise<OrderBillingDetails> => {
    const { data } = await api.get<OrderBillingDetails>(`/api/v1/billing/${ordenId}`);
    return data;
  },
};