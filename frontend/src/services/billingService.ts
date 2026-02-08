import { api } from '../lib/axios';
import type {
  PaymentDTO,
  OrderBillingDetails
} from '../types/models';

export const billingService = {
  /**
   * Process payment for an order.
   * Handles switching between simple cashier payment and electronic billing payment.
   */
  payOrder: async (ordenId: number, data: PaymentDTO): Promise<{ ok: boolean }> => {
    // If factura_electronica is true, use the billing endpoint.
    // Otherwise, use the standard cashier endpoint.

    // Validate that if factura_electronica is true, client details are present.
    // Although the hook/form should handle validation, a check here is good practice.
    if (data.factura_electronica) {
      if (!data.cliente_doc || !data.cliente_nombre) {
        throw new Error('Datos del cliente son obligatorios para factura electrónica');
      }
      const response = await api.post<{ ok: boolean }>(`/api/v1/billing/orders/${ordenId}/pay`, data);
      return response.data;
    } else {
      // Simple payment
      const response = await api.post<{ ok: boolean }>(`/api/v1/cashier/pay/${ordenId}`, data);
      return response.data;
    }
  },

  /**
   * Get billing details for a specific order.
   */
  getOrderBillingDetails: async (ordenId: number): Promise<OrderBillingDetails> => {
    const response = await api.get<OrderBillingDetails>(`/api/v1/billing/${ordenId}`);
    return response.data;
  },
};