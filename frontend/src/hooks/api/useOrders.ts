import { useQuery } from '@tanstack/react-query';
import { posService } from '../../services/posService';
import { api } from '../../lib/axios';

export const useActiveOrder = (mesaId: number | null) => {
  return useQuery({
    queryKey: ['activeOrder', mesaId],
    queryFn: () => posService.getActiveOrder(mesaId!),
    enabled: !!mesaId,
    refetchInterval: 5000, // Polling cada 5s para sincronizar entre meseros
    retry: false, 
  });
};

export const useKitchenOrders = () => {
    return useQuery({
        queryKey: ['kitchenOrders'],
        queryFn: async () => {
            const { data } = await api.get('/api/v1/kitchen/pendientes');
            return data;
        },
        refetchInterval: 10000, // Polling cocina cada 10s
    });
};