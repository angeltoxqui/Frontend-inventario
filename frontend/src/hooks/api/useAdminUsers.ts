import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUsersService } from '../../services/adminUsersService';
import type { CreatePOSUserDTO } from '../../services/adminUsersService';
import { toast } from 'sonner';

const ADMIN_USERS_KEYS = {
    users: ['admin', 'posUsers'] as const,
};

/**
 * Hook para gestionar usuarios internos del POS (meseros, cocineros, cajeros).
 * Usa endpoints /api/v1/admin/users/ (41, 42, 43)
 */
export function useAdminUsers() {
    const queryClient = useQueryClient();

    const {
        data: users,
        isLoading: isLoadingUsers,
        isError: isErrorUsers,
    } = useQuery({
        queryKey: ADMIN_USERS_KEYS.users,
        queryFn: adminUsersService.getUsers,
    });

    const createUserMutation = useMutation({
        mutationFn: adminUsersService.createUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEYS.users });
            toast.success('Usuario creado exitosamente');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Error al crear usuario');
        },
    });

    const deleteUserMutation = useMutation({
        mutationFn: adminUsersService.deleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEYS.users });
            toast.success('Usuario eliminado');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Error al eliminar usuario');
        },
    });

    return {
        users,
        isLoadingUsers,
        isErrorUsers,
        createUser: createUserMutation.mutate,
        isCreatingUser: createUserMutation.isPending,
        deleteUser: deleteUserMutation.mutate,
    };
}
