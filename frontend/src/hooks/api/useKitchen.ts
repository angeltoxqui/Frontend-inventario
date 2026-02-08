import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posService } from '../../services/posService';
import type { KitchenOrder } from '../../types/models';
import { toast } from 'sonner';

const KITCHEN_KEYS = {
    orders: ['kitchen', 'orders'] as const,
};

export function useKitchen() {
    const queryClient = useQueryClient();

    const {
        data: orders,
        isLoading,
        isError,
    } = useQuery({
        queryKey: KITCHEN_KEYS.orders,
        queryFn: posService.getPendingKitchenOrders,
        refetchInterval: 10000, // Polling every 10s
    });

    // OPTIMISTIC UPDATE: Mark Ready
    const markReadyMutation = useMutation({
        mutationFn: posService.markOrderReady,
        onMutate: async (ordenId: number) => {
            await queryClient.cancelQueries({ queryKey: KITCHEN_KEYS.orders });

            const previousOrders = queryClient.getQueryData<KitchenOrder[]>(KITCHEN_KEYS.orders);

            if (previousOrders) {
                // Remove the order from the list optimistically
                queryClient.setQueryData<KitchenOrder[]>(KITCHEN_KEYS.orders, (old) =>
                    old ? old.filter((o) => o.orden_id !== ordenId) : []
                );
            }

            return { previousOrders };
        },
        onError: (err, ordenId, context) => {
            if (context?.previousOrders) {
                queryClient.setQueryData(KITCHEN_KEYS.orders, context.previousOrders);
            }
            toast.error('Failed to mark order as ready');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: KITCHEN_KEYS.orders });
            // Also invalidate tables to update visual state found in Tables view
            queryClient.invalidateQueries({ queryKey: ['tables', 'list'] });
        },
    });

    return {
        orders,
        isLoading,
        isError,
        markOrderReady: markReadyMutation.mutate,
    };
}
