import { api } from '../lib/axios';
import type { Ingredient, CreateIngredientDTO, UpdateIngredientDTO } from '../types/models';

export const inventoryService = {
    // List ingredients
    getIngredients: async (): Promise<Ingredient[]> => {
        const { data } = await api.get<Ingredient[]>('/api/v1/inventory/supplies');
        return data;
    },

    // Create ingredient
    createIngredient: async (data: CreateIngredientDTO): Promise<Ingredient> => {
        const { data: newItem } = await api.post<Ingredient>('/api/v1/inventory/supplies', data);
        return newItem;
    },

    // Update ingredient
    updateIngredient: async (id: number, data: UpdateIngredientDTO): Promise<void> => {
        await api.patch(`/api/v1/inventory/supplies/${id}`, data);
    },

    // Delete ingredient
    deleteIngredient: async (id: number): Promise<void> => {
        await api.delete(`/api/v1/inventory/supplies/${id}`);
    },

    // Adjust stock — uses PATCH /inventory/supplies/{id} with { stock_actual }
    // Guide: "PATCH /inventory/supplies/{id} — campos parciales"
    adjustStock: async (id: number, newStock: number): Promise<void> => {
        await api.patch(`/api/v1/inventory/supplies/${id}`, { stock_actual: newStock });
    }
};
