import axios from 'axios';
import { Order, OrderItem, ClientData } from '../types';

// URL de tu Backend Python (asegúrate que el puerto coincida con el backend)
const API_URL = 'http://localhost:8000/api/billing'; 

export const BillingService = {
  emitInvoice: async (
    order: Order, 
    items: OrderItem[], 
    client: ClientData, 
    paymentMethod: string
  ) => {
    
    // Preparamos el JSON tal cual lo espera el backend Python
    const payload = {
      orderId: order.id,
      paymentMethod: paymentMethod,
      total: items.reduce((acc, item) => acc + (item.price * item.quantity), 0),
      client: {
        nit: client.nit,
        name: client.name,
        email: client.email,
        phone: client.phone || "0000000000",
        address: "Dirección local"
      },
      items: items.map(i => ({
        id: i.productId,
        name: i.productName,
        price: i.price,
        quantity: i.quantity,
        is_taxed: false // Cambiar a true si manejas IVA
      }))
    };

    try {
      // Enviamos la petición
      const response = await axios.post(`${API_URL}/emit`, payload);
      return response.data; // Retorna { status: "success", data: { cufe: "...", qr: "..." } }
    } catch (error) {
      console.error("Error facturando:", error);
      throw error;
    }
  }
};