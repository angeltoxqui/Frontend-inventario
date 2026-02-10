import axios, { InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
// Asegúrate de que esta ruta sea correcta según tu estructura
import { useAuthStore } from '../hooks/useAuth'; 

// Usamos la variable estandarizada
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL,
    withCredentials: true, // Vital para cookies y CORS
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Interceptor de Solicitud (Inyectar Token y Tenant) ---
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const { token, tenantId } = useAuthStore.getState();

        // 1. Inyectar Token (Bearer)
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // 2. Inyectar Tenant ID (Lógica SaaS)
        // Evitamos enviarlo si es una ruta de SuperAdmin para no causar conflictos
        const isSuperAdmin = config.url?.includes('/super-admin');
        
        if (tenantId && !isSuperAdmin && config.headers) {
            config.headers['X-Tenant-Id'] = tenantId;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// --- Interceptor de Respuesta (Manejo de Errores Global) ---
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const message = error.response?.data?.detail || 'Ocurrió un error inesperado';

        // Manejo centralizado de errores
        switch (status) {
            case 401:
                toast.error('Sesión expirada. Inicie sesión nuevamente.');
                useAuthStore.getState().logout();
                // Opcional: window.location.href = '/login'; 
                // (Mejor dejar que React Router maneje la redirección por estado)
                break;
            case 403:
                toast.warning('No tienes permisos para esta acción.');
                break;
            case 500:
                toast.error('Error del servidor. Intente más tarde.');
                break;
            default:
                // Solo mostramos error si no fue cancelado por el usuario
                if (error.code !== 'ERR_CANCELED') {
                    toast.error(message);
                }
        }

        return Promise.reject(error);
    }
);