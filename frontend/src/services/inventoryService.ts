import { api } from '../lib/axios';
import type {
    Ingredient,
    CreateIngredientDTO,
    UpdateIngredientDTO
} from '../types/models';

export const inventoryService = {
    /**
     * Health check
     */
    checkHealth: async (): Promise<{ status: string }> => {
        const response = await api.get<{ status: string }>('/api/v1/inventory/');
        return response.data;
    },

    /**
     * List all ingredients
     */
    getIngredients: async (): Promise<Ingredient[]> => {
        const response = await api.get<Ingredient[]>('/api/v1/inventory/insumos/');
        return response.data;
    },

    /**
     * Create a new ingredient
     */
    createIngredient: async (data: CreateIngredientDTO): Promise<Ingredient> => {
        const response = await api.post<Ingredient>('/api/v1/inventory/insumos/', data);
        return response.data;
    },

    /**
     * Update an ingredient
     */
    updateIngredient: async (id: number, data: UpdateIngredientDTO): Promise<void> => {
        await api.patch(`/api/v1/inventory/insumos/${id}`, data);
    },

    /**
     * Delete an ingredient
     */
    deleteIngredient: async (id: number): Promise<void> => {
        await api.delete(`/api/v1/inventory/insumos/${id}`);
    },

    /**
     * Adjust ingredient stock
     * @param id Ingredient ID
     * @param cantidad Amount to add (positive) or subtract (negative)
     */
    adjustStock: async (id: number, cantidad: number): Promise<Ingredient> => {
        const response = await api.post<Ingredient>(`/api/v1/inventory/insumos/${id}/ajustar_stock?cantidad=${cantidad}`);
        return response.data;
    }
};
