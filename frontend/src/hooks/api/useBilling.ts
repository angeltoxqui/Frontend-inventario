import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billingService } from '../../services/billingService';
import type { PaymentDTO } from '../../types/api';
import { toast } from 'sonner';

const BILLING_KEYS = {
    order: (ordenId: number) => ['billing', 'order', ordenId] as const,
};

export function useBilling() {
    const queryClient = useQueryClient();


    const payOrderMutation = useMutation({
        mutationFn: ({ ordenId, data }: { ordenId: number; data: PaymentDTO }) =>
            billingService.payOrder(ordenId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables', 'list'] });
            queryClient.invalidateQueries({ queryKey: ['pos', 'activeOrder'] }); // Invalidate generic active order? No, needs mesaId. 
            // Ideally we invalidate everything related to orders.
            toast.success('Payment successful');
            // Redirect or clear state? 
            // Usually after payment, we go back to table list or stay to print receipt.
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Payment failed');
        },
    });

    return {
        payOrder: payOrderMutation.mutate,
        isPaying: payOrderMutation.isPending,
    };
}

export function useOrderBillingDetails(ordenId: number, enabled = true) {
    return useQuery({
        queryKey: BILLING_KEYS.order(ordenId),
        queryFn: () => billingService.getOrderBillingDetails(ordenId),
        enabled: enabled && !!ordenId,
    });
}
