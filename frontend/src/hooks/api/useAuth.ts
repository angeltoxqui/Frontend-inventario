import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../../services/authService';
import type { LoginCredentials, RegisterCredentials, User } from '../../types/models';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';

// Key for auth query
const AUTH_KEYS = {
    user: ['auth', 'user'] as const,
};

export function useAuth() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Query to fetch current user
    const { data: user, isLoading, isError, error } = useQuery({
        queryKey: AUTH_KEYS.user,
        queryFn: authService.me,
        retry: false, // Don't retry on 401s
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Login mutation
    const loginMutation = useMutation({
        mutationFn: authService.login,
        onSuccess: (data) => {
            // Invalidate and refetch user query
            queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });
            toast.success('Login successful');
            navigate({ to: '/' }); // Redirect to dashboard
        },
        onError: (error: any) => {
            // Error handling is partly done in axios interceptor, but we can do more here
            const message = error.response?.data?.detail || 'Login failed';
            toast.error(message);
        },
    });

    // Register mutation
    const registerMutation = useMutation({
        mutationFn: authService.register,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });
            toast.success('Registration successful');
            navigate({ to: '/' });
        },
        onError: (error: any) => {
            const message = error.response?.data?.detail || 'Registration failed';
            toast.error(message);
        },
    });

    // Logout mutation
    const logoutMutation = useMutation({
        mutationFn: authService.logout,
        onSuccess: () => {
            // Clear user data
            queryClient.setQueryData(AUTH_KEYS.user, null);
            queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });
            toast.success('Logged out successfully');
            navigate({ to: '/login' });
        },
        onError: (error: any) => {
            const message = error.response?.data?.detail || 'Logout failed';
            toast.error(message);
        },
    });

    return {
        user,
        isLoading,
        isError,
        error,
        login: loginMutation.mutate,
        isLoggingIn: loginMutation.isPending,
        register: registerMutation.mutate,
        isRegistering: registerMutation.isPending,
        logout: logoutMutation.mutate,
        isLoggingOut: logoutMutation.isPending,
    };
}
