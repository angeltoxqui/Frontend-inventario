import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

// Determine baseURL based on environment
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true, // Crucial for HttpOnly cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Request Interceptor ---
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // 1. Inject Token (if it exists in localStorage - hybrid approach)
        // Note: If using ONLY HttpOnly cookies for everything, this might be redundant for some calls,
        // but the spec mentions Bearer token for protected endpoints.
        const token = localStorage.getItem('auth_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // 2. Multi-tenancy Logic (Tenant ID)
        const tenantId = localStorage.getItem('tenant_id');

        // Check if it's a Superadmin route to EXCLUDE the header
        const isSuperAdminRoute = config.url?.includes('/api/v1/api/super-admin');

        if (tenantId && !isSuperAdminRoute && config.headers) {
            config.headers['X-Tenant-Id'] = tenantId;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// --- Response Interceptor ---
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        const status = error.response?.status;
        const data: any = error.response?.data;

        if (status === 401) {
            // Unauthorized
            toast.error('Sesión expirada. Por favor inicia sesión nuevamente.');
            // Optional: Redirect logic can be handled here or by the hook consuming this
            // window.location.href = '/login'; 
        } else if (status === 403) {
            toast.warning('No tienes permisos para realizar esta acción.');
        } else if (status && status >= 500) {
            toast.error(`Error del servidor (${status}). Intenta más tarde.`);
        } else {
            // Validation or business errors
            const message = data?.detail || data?.message || 'Ocurrió un error desconocido';
            // Only show toast if it looks like a user-facing error message, otherwise let component handle it
            if (status !== 404) { // 404 might be expected in some checks
                toast.error(message);
            }
        }

        return Promise.reject(error);
    }
);
