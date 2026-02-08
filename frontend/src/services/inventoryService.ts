import { api } from '../lib/axios';
import type { Ingredient, CreateIngredientDTO, UpdateIngredientDTO } from '../types/models';

export const inventoryService = {
    // List ingredients
    getIngredients: async (): Promise<Ingredient[]> => {
        const { data } = await api.get<Ingredient[]>('/api/v1/inventory/insumos/');
        return data;
    },

    // Create ingredient
    createIngredient: async (data: CreateIngredientDTO): Promise<Ingredient> => {
        const { data: newItem } = await api.post<Ingredient>('/api/v1/inventory/insumos/', data);
        return newItem;
    },

    // Update ingredient
    updateIngredient: async (id: number, data: UpdateIngredientDTO): Promise<void> => {
        await api.patch(`/api/v1/inventory/insumos/${id}`, data);
    },

    // Delete ingredient
    deleteIngredient: async (id: number): Promise<void> => {
        await api.delete(`/api/v1/inventory/insumos/${id}`);
    },

    // Adjust stock
    adjustStock: async (id: number, cantidad: number): Promise<Ingredient> => {
        // cantidad can be negative (subtract) or positive (add)
        const { data } = await api.post<Ingredient>(
            `/api/v1/inventory/insumos/${id}/ajustar_stock`,
            null,
            { params: { cantidad } } // Query param
        );
        return data;
    }
};
