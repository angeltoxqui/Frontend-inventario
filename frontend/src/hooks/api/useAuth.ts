import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../../services/authService';
import type { LoginCredentials, RegisterCredentials } from '../../types/models';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';

// Cache Keys
const AUTH_KEYS = {
    user: ['auth', 'user'] as const,
};

export const useAuth = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // 1. Query to get active user (runs on app load)
    const {
        data: user,
        isLoading,
        isError,
        error,
        refetch: checkSession
    } = useQuery({
        queryKey: AUTH_KEYS.user,
        queryFn: authService.me,
        retry: false, // Don't retry if 401/fail
        staleTime: 1000 * 60 * 5, // 5 minutes fresh
    });

    // 2. Login Mutation
    const loginMutation = useMutation({
        mutationFn: (creds: LoginCredentials) => authService.login(creds),
        onSuccess: (data) => {
            toast.success('Bienvenido de nuevo');

            // Update cache
            // If login returns user object, we could set it directly. 
            // But typically it returns { message, user_id, access_token? }
            // So we invalidate to fetch full /me details or manually construct if possible.
            queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });

            // Store token if returned (Hybrid approach)
            // The interface AuthResponse usually has message, user_id. 
            // If access_token is there, save it.
            if ((data as any).access_token) {
                localStorage.setItem('auth_token', (data as any).access_token);
            }

            navigate({ to: '/' }); // Redirect to dashboard
        },
        onError: (error: any) => {
            // Toast handled by axios interceptor usually, but can add specifics here
            console.error('Login failed', error);
        },
    });

    // 3. Logout Mutation
    const logoutMutation = useMutation({
        mutationFn: authService.logout,
        onSuccess: () => {
            queryClient.setQueryData(AUTH_KEYS.user, null);
            queryClient.clear(); // Clear all cache
            localStorage.removeItem('auth_token');
            localStorage.removeItem('tenant_id'); // Clear tenant on logout
            toast.info('Sesión cerrada');
            navigate({ to: '/login' });
        },
        onError: (error: any) => {
            console.error('Logout failed', error);
        }
    });

    // 4. Register Mutation
    const registerMutation = useMutation({
        mutationFn: (creds: RegisterCredentials) => authService.register(creds),
        onSuccess: () => {
            toast.success('Registro exitoso');
            navigate({ to: '/' });
        },
        onError: (error: any) => {
            console.error('Registration failed', error);
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
        register: registerMutation.mutate,
        isLoggingIn: loginMutation.isPending,
        isLoggingOut: logoutMutation.isPending,
        isRegistering: registerMutation.isPending,
        checkSession,
    };
};
