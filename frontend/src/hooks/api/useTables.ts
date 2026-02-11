import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tablesService } from '../../services/tablesService';
// CreateTableDTO is inferred from the service calls
import { toast } from 'sonner';

const TABLES_KEYS = {
    tables: ['tables', 'list'] as const,
};

export function useTables() {
    const queryClient = useQueryClient();

    // Poll tables every 10 seconds to keep visual state updated
    const {
        data: tables,
        isLoading: isLoadingTables,
        isError: isErrorTables,
    } = useQuery({
        queryKey: TABLES_KEYS.tables,
        queryFn: tablesService.getTables,
        refetchInterval: 10000,
    });

    const createTableMutation = useMutation({
        mutationFn: tablesService.createTable,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TABLES_KEYS.tables });
            toast.success('Table created successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to create table');
        },
    });

    const occupyTableMutation = useMutation({
        mutationFn: tablesService.occupyTable,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TABLES_KEYS.tables });
            toast.success('Table occupied');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to occupy table');
        },
    });

    const releaseTableMutation = useMutation({
        mutationFn: tablesService.releaseTable,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TABLES_KEYS.tables });
            toast.success('Table released');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to release table');
        },
    });

    return {
        tables,
        isLoadingTables,
        isErrorTables,
        createTable: createTableMutation.mutate,
        isCreatingTable: createTableMutation.isPending,
        occupyTable: occupyTableMutation.mutate,
        releaseTable: releaseTableMutation.mutate,
    };
}
