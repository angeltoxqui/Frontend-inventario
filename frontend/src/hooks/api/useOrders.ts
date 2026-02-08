import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posService } from '../../services/posService';
import { api } from '../../lib/axios';
import { toast } from 'sonner';

export const useActiveOrder = (mesaId: number | null) => {
    return useQuery({
        queryKey: ['activeOrder', mesaId],
        queryFn: () => posService.getActiveOrder(mesaId!),
        enabled: !!mesaId,
        refetchInterval: 5000, // Polling cada 5s para sincronizar entre meseros
        retry: false, // Si falla (ej. 404 no hay orden), no reintentar infinitamente
    });
};

export const useKitchenOrders = () => {
    return useQuery({
        queryKey: ['kitchenOrders'],
        queryFn: async () => {
            const { data } = await api.get('/api/v1/kitchen/pendientes'); // Requiere import api
            return data;
        },
        refetchInterval: 10000, // Polling cocina cada 10s
    });
};
