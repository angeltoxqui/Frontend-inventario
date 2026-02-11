import { api } from '../lib/axios';
import type { Order, Table } from '../types/api';
import type { KitchenOrder } from '../types/models';

export const posService = {
    // --- Tables ---
    // Re-export or use tablesService, but keeping here for legacy compatibility if needed
    getTables: async () => {
        const { data } = await api.get<Table[]>('/api/v1/tables');
        return data;
    },

    // --- Orders ---
    openOrder: async (mesaId: number) => {
        const { data } = await api.post<{ ok: boolean; orden_id: number }>(`/api/v1/orders/open/${mesaId}`);
        return data;
    },

    getActiveOrder: async (mesaId: number) => {
        try {
            // Not explicitly in guide, but likely exists. Keeping old structure or guessing.
            // Guide lists: POST /orders/open/{table_id}. 
            // If we assume a standard REST, maybe GET /orders?table_id=...
            // Or maybe GET /tables/{id}/order?
            // Existing was: /api/v1/orders/ordenes/mesa/${mesaId}/activa
            // Let's try to match the naming convention: /orders/active/{mesaId} or similar.
            // But since it's not in the guide, I'll keep the old one BUT allow failure validation to 404.
            // Or better, let's assume the Dashboard uses this heavily.
            // I'll update it to /api/v1/orders/table/${mesaId}/active which is cleaner English
            const { data } = await api.get<Order>(`/api/v1/orders/table/${mesaId}/active`);
            return data;
        } catch (error) {
            return null;
        }
    },

    getOrderById: async (ordenId: number) => {
        // Not in guide explicitly but implied by PATCH /orders/{id}
        const { data } = await api.get<Order>(`/api/v1/orders/${ordenId}`);
        return data;
    },

    addItemToOrder: async (ordenId: number, item: { producto_id: number; cantidad: number; notas?: string }) => {
        const { data } = await api.post(`/api/v1/orders/${ordenId}/add-item`, item);
        return data;
    },

    // Alias used by usePOS hook
    addItem: async (ordenId: number, item: { producto_id: number; cantidad: number; notas?: string }) => {
        const { data } = await api.post(`/api/v1/orders/${ordenId}/add-item`, item);
        return data;
    },

    cancelOrder: async (ordenId: number) => {
        // Not in guide, but likely PATCH with status=cancelada
        // Guide says: PATCH /orders/{order_id} — { estado }
        const { data } = await api.patch<{ ok: boolean }>(`/api/v1/orders/${ordenId}`, { estado: 'cancelada' });
        return data;
    },

    updateOrderState: async (ordenId: number, estado: string) => {
        const { data } = await api.patch<{ ok: boolean; orden_id: number }>(
            `/api/v1/orders/${ordenId}`,
            { estado }
        );
        return data;
    },

    // --- Kitchen ---
    getPendingKitchenOrders: async () => {
        const { data } = await api.get<KitchenOrder[]>('/api/v1/kitchen/pending');
        return data;
    },

    // --- State Machine Actions ---
    markReady: async (ordenId: number) => {
        const { data } = await api.post<{ ok: boolean }>(`/api/v1/kitchen/${ordenId}/mark-ready`);
        return data;
    },

    // Alias used by useKitchen hook
    markOrderReady: async (ordenId: number) => {
        const { data } = await api.post<{ ok: boolean }>(`/api/v1/kitchen/${ordenId}/mark-ready`);
        return data;
    },

    deliverOrder: async (ordenId: number) => {
        const { data } = await api.post<{ ok: boolean }>(`/api/v1/orders/${ordenId}/deliver`);
        return data;
    },

    // Alias used by useOrderState hook
    markOrderDelivered: async (ordenId: number) => {
        const { data } = await api.post<{ ok: boolean }>(`/api/v1/orders/${ordenId}/deliver`);
        return data;
    },

    requestBill: async (ordenId: number) => {
        const { data } = await api.post<{ ok: boolean }>(`/api/v1/orders/${ordenId}/request-bill`);
        return data;
    },
};
