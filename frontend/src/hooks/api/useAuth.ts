import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../../services/authService';
import type { LoginCredentials } from '../../types/models';
import { useAuthStore } from '../useAuth';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';

// Cache Keys
const AUTH_KEYS = {
    user: ['auth', 'user'] as const,
};

export const useAuth = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // 1. Query to get active Supabase user (runs on app load)
    const {
        data: user,
        isLoading,
        isError,
        error,
        refetch: checkSession
    } = useQuery({
        queryKey: AUTH_KEYS.user,
        queryFn: authService.getUser,
        retry: false,
        staleTime: 1000 * 60 * 5, // 5 minutes fresh
    });

    // 2. Login Mutation (Supabase)
    const loginMutation = useMutation({
        mutationFn: (creds: LoginCredentials) => authService.login(creds),
        onSuccess: (data) => {
            toast.success('Bienvenido de nuevo');

            // Supabase returns { session, user }
            const session = data.session;
            const supaUser = data.user;

            if (session) {
                // Update Zustand store
                const { setAuth, setTenant } = useAuthStore.getState();
                setAuth({
                    user_id: supaUser?.id || '',
                    email: supaUser?.email,
                    role: 'admin', // TODO: extract from user metadata
                }, session.access_token);

                const defaultTenant = import.meta.env.VITE_DEFAULT_TENANT || 'tenant_000001';
                setTenant(defaultTenant);
            }

            queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });
            navigate({ to: '/' });
        },
        onError: (error: any) => {
            console.error('Login failed', error);
            toast.error(error.message || 'Error al iniciar sesión');
        },
    });

    // 3. Logout Mutation
    const logoutMutation = useMutation({
        mutationFn: authService.logout,
        onSuccess: () => {
            queryClient.setQueryData(AUTH_KEYS.user, null);
            queryClient.clear();
            useAuthStore.getState().logout();
            toast.info('Sesión cerrada');
            navigate({ to: '/login' });
        },
        onError: (error: any) => {
            console.error('Logout failed', error);
        }
    });

    return {
        user,
        isAuthenticated: !!user,
        isLoading,
        isError,
        error,
        login: loginMutation.mutate,
        logout: logoutMutation.mutate,
        isLoggingIn: loginMutation.isPending,
        isLoggingOut: logoutMutation.isPending,
        checkSession,
    };
};
