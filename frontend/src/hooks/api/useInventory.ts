import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../../services/inventoryService';
import type { UpdateIngredientDTO } from '../../types/models';
import { toast } from 'sonner';

const INVENTORY_KEYS = {
    ingredients: ['inventory', 'ingredients'] as const,
};

export function useInventory() {
    const queryClient = useQueryClient();

    const {
        data: ingredients,
        isLoading: isLoadingIngredients,
        isError: isErrorIngredients,
    } = useQuery({
        queryKey: INVENTORY_KEYS.ingredients,
        queryFn: inventoryService.getIngredients,
    });

    const createIngredientMutation = useMutation({
        mutationFn: inventoryService.createIngredient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.ingredients });
            toast.success('Ingredient created successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to create ingredient');
        },
    });

    const updateIngredientMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateIngredientDTO }) =>
            inventoryService.updateIngredient(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.ingredients });
            toast.success('Ingredient updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to update ingredient');
        },
    });

    const deleteIngredientMutation = useMutation({
        mutationFn: inventoryService.deleteIngredient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.ingredients });
            toast.success('Ingredient deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to delete ingredient');
        },
    });

    const adjustStockMutation = useMutation({
        mutationFn: ({ id, cantidad }: { id: number; cantidad: number }) =>
            inventoryService.adjustStock(id, cantidad),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.ingredients });
            toast.success('Stock adjusted successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to adjust stock');
        },
    });

    return {
        ingredients,
        isLoadingIngredients,
        isErrorIngredients,
        createIngredient: createIngredientMutation.mutate,
        isCreatingIngredient: createIngredientMutation.isPending,
        updateIngredient: updateIngredientMutation.mutate,
        deleteIngredient: deleteIngredientMutation.mutate,
        adjustStock: adjustStockMutation.mutate,
        isAdjustingStock: adjustStockMutation.isPending,
    };
}
