import { useMutation, useQueryClient } from '@tanstack/react-query';
import { posService } from '../../services/posService';
import { toast } from 'sonner';

export function useOrderState() {
    const queryClient = useQueryClient();

    // Mark Delivered
    const markDeliveredMutation = useMutation({
        mutationFn: posService.markOrderDelivered,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables', 'list'] });
            // Could also invalidate active order if we are viewing it
            toast.success('Order delivered');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to update order');
        },
    });

    // Request Bill
    const requestBillMutation = useMutation({
        mutationFn: posService.requestBill,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables', 'list'] });
            toast.success('Bill requested');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to request bill');
        },
    });

    return {
        markOrderDelivered: markDeliveredMutation.mutate,
        requestBill: requestBillMutation.mutate,
    };
}
