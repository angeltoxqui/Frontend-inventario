import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '../hooks/useAuth'; // Asumimos un store simple

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL,
    withCredentials: true, // Crucial para las cookies HttpOnly
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const { token, tenantId } = useAuthStore.getState();

        // 1. Inyectar Token si existe (para Superadmin o fallback)
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // 2. Lógica de X-Tenant-Id
        // NO inyectar si es endpoint de superadmin (doble /api/ check)
        const isSuperAdminEndpoint = config.url?.includes('/api/v1/api/super-admin');

        if (tenantId && !isSuperAdminEndpoint && config.headers) {
            config.headers['X-Tenant-Id'] = tenantId;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        const status = error.response?.status;
        const data: any = error.response?.data;

        if (status === 401) {
            // Redirigir a login si falla la auth
            toast.error('Sesión expirada. Por favor inicie sesión nuevamente.');
            useAuthStore.getState().logout();
            window.location.href = '/login';
        } else if (status === 403) {
            toast.warning('No tienes permisos para realizar esta acción.');
        } else if (status === 500) {
            toast.error('Error interno del servidor. Contacte soporte.');
        } else {
            toast.error(data?.detail || 'Ocurrió un error inesperado');
        }

        return Promise.reject(error);
    }
);
