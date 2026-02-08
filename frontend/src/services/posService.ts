import { api } from '../lib/axios';
import { Action, AsyncState, KitchenOrder, Order, Table } from "../types/api";

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

    addItemToOrder: async (ordenId: number, item: { producto_id: number; cantidad: number; notas?: string }) => {
        const { data } = await api.post(`/api/v1/orders/ordenes/${ordenId}/agregar`, item);
        return data;
    },

    // --- State Machine Actions ---
    markReady: async (ordenId: number) => {
        return api.post(`/api/v1/ordenes/${ordenId}/marcar_listo`);
    },

    deliverOrder: async (ordenId: number) => {
        return api.post(`/api/v1/ordenes/${ordenId}/entregar_mesa`);
    },

    requestBill: async (ordenId: number) => {
        return api.post(`/api/v1/ordenes/${ordenId}/solicitar_cuenta`);
    }
};
