// src/services/billingService.ts
// Servicio para facturación electrónica con Factus (DIAN Colombia)

import { OrderItem } from '../types';
import { supabase } from '../supabaseClient';

// URL del backend de facturación
const BILLING_API_URL = import.meta.env.VITE_BILLING_API_URL || 'http://127.0.0.1:8000';
const DEFAULT_RESTAURANT_ID = Number(import.meta.env.VITE_RESTAURANT_ID) || 1;

/**
 * Obtiene los headers de autenticación con el JWT de Supabase
 */
const getAuthHeaders = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

/**
 * Tipos para facturación
 */
export interface BillingRange {
  id: number;
  factus_id: number;
  resolution_number: string;
  prefix: string | null;
  from_number: number;
  to_number: number;
  current_number: number;
  expiration_date: string | null;
  is_active: boolean;
  is_expired: boolean;
  remaining_numbers: number;
  usage_percentage: number;
}

export interface ActiveRange {
  factus_id: number;
  prefix: string | null;
  resolution_number: string;
  current_number: number;
  remaining_numbers: number;
  is_valid: boolean;
}

export interface ClientData {
  nit?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface InvoiceRequest {
  order_id: string;
  payment_method: 'efectivo' | 'tarjeta' | 'nequi' | 'otro';
  numbering_range_id: number;
  customer_nit?: string;
  customer_name?: string;
  customer_email?: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

export interface InvoiceResponse {
  success: boolean;
  invoice_number?: string;
  cufe?: string;
  pdf_url?: string;
  qr_url?: string;
  message?: string;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  synced_count: number;
  created_count: number;
  updated_count: number;
  ranges: BillingRange[];
}

/**
 * BillingService - Servicio de facturación electrónica Factus
 * 
 * Conexión con el backend Python que integra con Factus para
 * emitir facturas electrónicas válidas ante la DIAN.
 */
export const BillingService = {
  /**
   * Verifica si el servicio de facturación está disponible
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${BILLING_API_URL}/api/billing/health`);
      return response.ok;
    } catch {
      console.warn('[BillingService] Backend de facturación no disponible');
      return false;
    }
  },

  /**
   * Sincroniza los rangos de numeración desde Factus
   */
  async syncRanges(restaurantId: number = DEFAULT_RESTAURANT_ID): Promise<SyncResult> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BILLING_API_URL}/api/billing/sync-ranges?restaurant_id=${restaurantId}`,
      {
        method: 'POST',
        headers
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error sincronizando rangos');
    }

    return response.json();
  },

  /**
   * Obtiene todos los rangos de un restaurante
   */
  async getRanges(restaurantId: number = DEFAULT_RESTAURANT_ID): Promise<BillingRange[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BILLING_API_URL}/api/billing/ranges?restaurant_id=${restaurantId}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error('Error obteniendo rangos');
    }

    return response.json();
  },

  /**
   * Obtiene el rango activo para facturar
   */
  async getActiveRange(restaurantId: number = DEFAULT_RESTAURANT_ID): Promise<ActiveRange | null> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${BILLING_API_URL}/api/billing/ranges/active?restaurant_id=${restaurantId}`,
        { headers }
      );

      if (response.status === 404) {
        return null; // No hay rango activo
      }

      if (!response.ok) {
        throw new Error('Error obteniendo rango activo');
      }

      return response.json();
    } catch (error) {
      console.error('[BillingService] Error obteniendo rango activo:', error);
      return null;
    }
  },

  /**
   * Activa un rango específico
   */
  async activateRange(
    rangeId: number,
    restaurantId: number = DEFAULT_RESTAURANT_ID
  ): Promise<boolean> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BILLING_API_URL}/api/billing/ranges/${rangeId}/activate?restaurant_id=${restaurantId}`,
      {
        method: 'POST',
        headers
      }
    );

    return response.ok;
  },

  /**
   * Crea una factura electrónica
   */
  async createInvoice(request: InvoiceRequest): Promise<InvoiceResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BILLING_API_URL}/api/billing/invoices/from-order`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.detail || 'Error creando factura',
        message: data.detail,
      };
    }

    return {
      success: true,
      invoice_number: data.invoice_number || data.number,
      cufe: data.cufe,
      pdf_url: data.pdf_url,
      qr_url: data.qr_url,
      message: 'Factura electrónica emitida exitosamente',
    };
  },

  /**
   * Valida una factura en Factus
   */
  async validateInvoice(invoiceNumber: string): Promise<InvoiceResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BILLING_API_URL}/api/billing/invoices/${invoiceNumber}/validate`,
      {
        method: 'POST',
        headers
      }
    );
    return response.json();
  },

  /**
   * Obtiene datos del ticket para impresión
   */
  async getTicketData(invoiceNumber: string): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BILLING_API_URL}/api/billing/invoices/${invoiceNumber}/ticket-data`,
      {
        headers
      }
    );
    if (!response.ok) {
      throw new Error('Error obteniendo datos del ticket');
    }
    return response.json();
  },

  /**
   * Factura una orden del POS (método principal)
   * 
   * @param orderId - ID de la orden
   * @param items - Items de la orden
   * @param paymentMethod - Método de pago
   * @param client - Datos del cliente (opcional)
   */
  async emitInvoice(
    orderId: string,
    items: OrderItem[],
    client: ClientData,
    paymentMethod: string
  ): Promise<InvoiceResponse> {
    // 1. Obtener rango activo
    const activeRange = await this.getActiveRange();

    if (!activeRange) {
      return {
        success: false,
        error: 'No hay un rango de numeración activo. Sincronice y active uno primero.',
        message: 'Error de configuración',
      };
    }

    if (!activeRange.is_valid) {
      return {
        success: false,
        error: 'El rango de numeración activo no es válido (vencido o agotado)',
        message: 'Rango inválido',
      };
    }

    // 2. Mapear método de pago
    const paymentMethodMap: Record<string, 'efectivo' | 'tarjeta' | 'nequi' | 'otro'> = {
      'efectivo': 'efectivo',
      'tarjeta': 'tarjeta',
      'nequi': 'nequi',
      'credito': 'tarjeta',
      'debito': 'tarjeta',
    };

    // 3. Crear request
    const request: InvoiceRequest = {
      order_id: orderId,
      payment_method: paymentMethodMap[paymentMethod.toLowerCase()] || 'otro',
      numbering_range_id: activeRange.factus_id,
      customer_nit: client.nit || '222222222222', // Consumidor final
      customer_name: client.name || 'Consumidor Final',
      customer_email: client.email,
      items: items.map(item => ({
        id: item.productId,
        name: item.productName,
        price: item.price,
        quantity: item.quantity,
      })),
    };

    // 4. Emitir factura
    return this.createInvoice(request);
  },

  /**
   * Verifica si la facturación electrónica está configurada
   */
  async isConfigured(): Promise<{ configured: boolean; error?: string }> {
    try {
      const healthOk = await this.checkHealth();
      if (!healthOk) {
        return { configured: false, error: 'Backend de facturación no responde' };
      }

      const activeRange = await this.getActiveRange();
      if (!activeRange) {
        return { configured: false, error: 'No hay un rango de numeración activo' };
      }

      if (!activeRange.is_valid) {
        return { configured: false, error: 'El rango activo está vencido o agotado' };
      }

      return { configured: true };
    } catch (error) {
      return { configured: false, error: String(error) };
    }
  },
};