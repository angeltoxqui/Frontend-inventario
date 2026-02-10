import { api } from '../lib/axios';
import type { Order, Table } from '../types/api';
import type { KitchenOrder } from '../types/models';

export const posService = {
    // --- Tables ---
    getTables: async () => {
        const { data } = await api.get<Table[]>('/api/v1/tables/');
        return data;
    },

    // --- Orders ---
    openOrder: async (mesaId: number) => {
        const { data } = await api.post<{ ok: boolean; orden_id: number }>(`/api/v1/orders/ordenes/abrir/${mesaId}`);
        return data;
    },

    getActiveOrder: async (mesaId: number) => {
        try {
            const { data } = await api.get<Order>(`/api/v1/orders/ordenes/mesa/${mesaId}/activa`);
            return data;
        } catch (error) {
            return null; // Return null if no active order found
        }
    },

    getOrderById: async (ordenId: number) => {
        const { data } = await api.get<Order>(`/api/v1/orders/ordenes/${ordenId}`);
        return data;
    },

    addItemToOrder: async (ordenId: number, item: { producto_id: number; cantidad: number; notas?: string }) => {
        const { data } = await api.post(`/api/v1/orders/ordenes/${ordenId}/agregar`, item);
        return data;
    },

    // Alias used by usePOS hook
    addItem: async (ordenId: number, item: { producto_id: number; cantidad: number; notas?: string }) => {
        const { data } = await api.post(`/api/v1/orders/ordenes/${ordenId}/agregar`, item);
        return data;
    },

    cancelOrder: async (ordenId: number) => {
        const { data } = await api.post<{ ok: boolean }>(`/api/v1/orders/ordenes/${ordenId}/cancelar`);
        return data;
    },

    updateOrderState: async (ordenId: number, estado: string) => {
        const { data } = await api.patch<{ ok: boolean; orden_id: number }>(
            `/api/v1/orders/ordenes/${ordenId}`,
            null,
            { params: { estado } }
        );
        return data;
    },

    // --- Kitchen ---
    getPendingKitchenOrders: async () => {
        const { data } = await api.get<KitchenOrder[]>('/api/v1/kitchen/pendientes');
        return data;
    },

    // --- State Machine Actions ---
    markReady: async (ordenId: number) => {
        const { data } = await api.post<{ ok: boolean }>(`/api/v1/ordenes/${ordenId}/marcar_listo`);
        return data;
    },

    // Alias used by useKitchen hook
    markOrderReady: async (ordenId: number) => {
        const { data } = await api.post<{ ok: boolean }>(`/api/v1/ordenes/${ordenId}/marcar_listo`);
        return data;
    },

    deliverOrder: async (ordenId: number) => {
        const { data } = await api.post<{ ok: boolean }>(`/api/v1/ordenes/${ordenId}/entregar_mesa`);
        return data;
    },

    // Alias used by useOrderState hook
    markOrderDelivered: async (ordenId: number) => {
        const { data } = await api.post<{ ok: boolean }>(`/api/v1/ordenes/${ordenId}/entregar_mesa`);
        return data;
    },

    requestBill: async (ordenId: number) => {
        const { data } = await api.post<{ ok: boolean }>(`/api/v1/ordenes/${ordenId}/solicitar_cuenta`);
        return data;
    },
};
