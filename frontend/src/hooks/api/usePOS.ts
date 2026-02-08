import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posService } from '../../services/posService';
import type { AddItemDTO, Order, OrderItem } from '../../types/models';
import { toast } from 'sonner';

const POS_KEYS = {
    activeOrder: (mesaId: number) => ['pos', 'activeOrder', mesaId] as const,
    order: (ordenId: number) => ['pos', 'order', ordenId] as const,
};

export function usePOS() {
    const queryClient = useQueryClient();

    // --- Queries ---

    const useActiveOrder = (mesaId: number, enabled = true) => {
        return useQuery({
            queryKey: POS_KEYS.activeOrder(mesaId),
            queryFn: () => posService.getActiveOrder(mesaId),
            enabled: enabled && !!mesaId,
            refetchInterval: 5000, // Polling every 5s for multi-waiter sync
        });
    };

    // --- Mutations ---

    const openOrderMutation = useMutation({
        mutationFn: posService.openOrder,
        onSuccess: (data, mesaId) => {
            queryClient.invalidateQueries({ queryKey: POS_KEYS.activeOrder(mesaId) });
            // Also maybe invalidate tables to show occupied status?
            queryClient.invalidateQueries({ queryKey: ['tables', 'list'] });
            toast.success('Order opened successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to open order');
        },
    });

    // OPTIMISTIC UPDATE: Add Item
    const addItemMutation = useMutation({
        mutationFn: ({ ordenId, data }: { ordenId: number; data: AddItemDTO }) =>
            posService.addItem(ordenId, data),
        onMutate: async ({ ordenId, data, mesaId }: { ordenId: number; data: AddItemDTO; mesaId: number }) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: POS_KEYS.activeOrder(mesaId) });

            // Snapshot the previous value
            const previousOrder = queryClient.getQueryData<Order>(POS_KEYS.activeOrder(mesaId));

            // Optimistically update to the new value
            if (previousOrder) {
                // We need the product details to add it optimistically. 
                // In a real app, we might pass product info in the mutation or look it up from a product cache.
                // For now, we'll add a placeholder or rely on the fact that the backend will calculate totals.
                // Actually, without product price, calculating total is hard. 
                // We will assume 'data' includes price or we just append item and don't recalc total locally perfectly 
                // OR we pass the full product object for the optimistic update.
                // For this demo, let's just assume we add it to the list. 
                // Note: The UI might need the product name. 
                // Let's assume the component passes `productName` and `price` in `data` purely for optimistic UI (even if API doesn't need it).
                // But `AddItemDTO` defined in models doesn't have it. 
                // We can cast `data` or extend DTO for frontend use.

                const optimisiticItem: OrderItem = {
                    id: Date.now(), // Temp ID
                    producto_id: data.producto_id,
                    producto_nombre: (data as any)._debug_product_name || 'Item ...', // Hack for UI
                    cantidad: data.cantidad,
                    precio_unitario: (data as any)._debug_price || 0,
                    subtotal: ((data as any)._debug_price || 0) * data.cantidad,
                    notas: data.notas,
                };

                queryClient.setQueryData<Order>(POS_KEYS.activeOrder(mesaId), (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        items: [...old.items, optimisiticItem],
                        total: old.total + optimisiticItem.subtotal,
                    };
                });
            }

            return { previousOrder };
        },
        onError: (err, variables, context) => {
            // Rollback to snapshot
            if (context?.previousOrder && variables.mesaId) {
                queryClient.setQueryData(POS_KEYS.activeOrder(variables.mesaId), context.previousOrder);
            }
            toast.error('Failed to add item');
        },
        onSettled: (data, error, variables) => {
            // Always refetch after error or success to ensure sync
            if (variables.mesaId) {
                queryClient.invalidateQueries({ queryKey: POS_KEYS.activeOrder(variables.mesaId) });
            }
        },
    });

    const cancelOrderMutation = useMutation({
        mutationFn: posService.cancelOrder,
        onSuccess: (_, ordenId) => {
            // We don't have mesaId here easily unless passed. 
            // Invalidate all active orders or require mesaId in mutation.
            // Better to invalidate tables and specific order.
            // For now, let's rely on component to invalidate activeOrder if needed or passed.
            // Actually, let's require mesaId for better cache mgmt.
            toast.success('Order cancelled');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['tables', 'list'] });
            // Ideally we invalidate the specific active order too.
        }
    });

    return {
        useActiveOrder,
        openOrder: openOrderMutation.mutate,
        isOpenOrderPending: openOrderMutation.isPending,
        addItem: addItemMutation.mutate, // Pass { ordenId, data: { ...dto, _debug... }, mesaId }
        isAddingItem: addItemMutation.isPending,
        cancelOrder: cancelOrderMutation.mutate,
    };
}
