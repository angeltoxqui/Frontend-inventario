import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';
import type { CreateStoreDTO, CreateTenantUserDTO } from '../../types/models';
import { toast } from 'sonner';

// Keys for admin queries
const ADMIN_KEYS = {
    stores: ['admin', 'stores'] as const,
    tenantUsers: (tenantId: string) => ['admin', 'tenantUsers', tenantId] as const,
};

export function useAdmin() {
    const queryClient = useQueryClient();

    // --- Stores ---

    const {
        data: stores,
        isLoading: isLoadingStores,
        isError: isErrorStores
    } = useQuery({
        queryKey: ADMIN_KEYS.stores,
        queryFn: adminService.getStores,
        // You might want to enable this only if user is superadmin, but we'll leave that to the component to decide or handle 403.
        retry: false,
    });

    const createStoreMutation = useMutation({
        mutationFn: adminService.createStore,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.stores });
            toast.success('Store created successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to create store');
        },
    });

    const updateStoreStatusMutation = useMutation({
        mutationFn: ({ tenantId, status }: { tenantId: string; status: 'active' | 'suspended' }) =>
            adminService.updateStoreStatus(tenantId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.stores });
            toast.success('Store status updated');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to update store status');
        }
    });

    // --- Tenant Users ---

    const useTenantUsers = (tenantId: string) => {
        return useQuery({
            queryKey: ADMIN_KEYS.tenantUsers(tenantId),
            queryFn: () => adminService.getTenantUsers(tenantId),
            enabled: !!tenantId,
        });
    };

    const assignUserMutation = useMutation({
        mutationFn: ({ tenantId, data }: { tenantId: string; data: CreateTenantUserDTO }) =>
            adminService.assignUserToTenant(tenantId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.tenantUsers(variables.tenantId) });
            toast.success('User assigned to tenant');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to assign user');
        }
    });

    const removeUserMutation = useMutation({
        mutationFn: ({ tenantId, userId }: { tenantId: string; userId: string }) =>
            adminService.removeUserFromTenant(tenantId, userId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.tenantUsers(variables.tenantId) });
            toast.success('User removed from tenant');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to remove user');
        }
    });

    const updateUserRoleMutation = useMutation({
        mutationFn: ({ tenantId, userId, role }: { tenantId: string; userId: string, role: string }) =>
            adminService.updateUserRole(tenantId, userId, role),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.tenantUsers(variables.tenantId) });
            toast.success('User role updated');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to update user role');
        }
    });

    return {
        // Stores
        stores,
        isLoadingStores,
        isErrorStores,
        createStore: createStoreMutation.mutate,
        isCreatingStore: createStoreMutation.isPending,
        updateStoreStatus: updateStoreStatusMutation.mutate,

        // Tenant Users (Exposed as a helper to call with tenantId, or direct mutations)
        useTenantUsers,
        assignUser: assignUserMutation.mutate,
        isAssigningUser: assignUserMutation.isPending,
        removeUser: removeUserMutation.mutate,
        updateUserRole: updateUserRoleMutation.mutate,
    };
}
