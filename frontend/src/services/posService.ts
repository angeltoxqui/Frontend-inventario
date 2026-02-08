import { api } from '../lib/axios';
import type {
    Order,
    AddItemDTO,
    OrderState,
    KitchenOrder
} from '../types/models';

export const posService = {
    // --- POS (Orders) ---

    /**
     * Open an order for a table
     */
    openOrder: async (mesaId: number): Promise<{ ok: boolean; orden_id: number }> => {
        const response = await api.post<{ ok: boolean; orden_id: number }>(`/api/v1/orders/ordenes/abrir/${mesaId}`);
        return response.data;
    },

    /**
     * Get active order for a table
     */
    getActiveOrder: async (mesaId: number): Promise<Order> => {
        const response = await api.get<Order>(`/api/v1/orders/ordenes/mesa/${mesaId}/activa`);
        return response.data;
    },

    /**
     * Get order by ID
     */
    getOrder: async (ordenId: number): Promise<Order> => {
        const response = await api.get<Order>(`/api/v1/orders/ordenes/${ordenId}`);
        return response.data;
    },

    /**
     * Add item to order
     */
    addItem: async (ordenId: number, data: AddItemDTO): Promise<{ ok: boolean }> => {
        const response = await api.post<{ ok: boolean }>(`/api/v1/orders/ordenes/${ordenId}/agregar`, data);
        return response.data;
    },

    /**
     * Update order state (Generic)
     */
    updateOrderState: async (ordenId: number, estado: OrderState): Promise<{ ok: boolean; orden_id: number }> => {
        const response = await api.patch<{ ok: boolean; orden_id: number }>(`/api/v1/orders/ordenes/${ordenId}?estado=${estado}`);
        return response.data;
    },

    /**
     * Cancel order
     */
    cancelOrder: async (ordenId: number): Promise<{ ok: boolean }> => {
        const response = await api.post<{ ok: boolean }>(`/api/v1/orders/ordenes/${ordenId}/cancelar`);
        return response.data;
    },

    // --- Specific State Transitions (Order State Service) ---

    /**
     * Mark order as ready (Kitchen)
     */
    markOrderReady: async (ordenId: number): Promise<{ ok: boolean }> => {
        const response = await api.post<{ ok: boolean }>(`/api/v1/ordenes/${ordenId}/marcar_listo`);
        return response.data;
    },

    /**
     * Mark order as delivered (Waiter)
     */
    markOrderDelivered: async (ordenId: number): Promise<{ ok: boolean }> => {
        const response = await api.post<{ ok: boolean }>(`/api/v1/ordenes/${ordenId}/entregar_mesa`);
        return response.data;
    },

    /**
     * Request bill (Waiter/Customer)
     */
    requestBill: async (ordenId: number): Promise<{ ok: boolean }> => {
        const response = await api.post<{ ok: boolean }>(`/api/v1/ordenes/${ordenId}/solicitar_cuenta`);
        return response.data;
    },

    // --- Kitchen (KDS) ---

    /**
     * Get pending kitchen orders
     */
    getPendingKitchenOrders: async (): Promise<KitchenOrder[]> => {
        const response = await api.get<KitchenOrder[]>('/api/v1/kitchen/pendientes');
        return response.data;
    },
};
