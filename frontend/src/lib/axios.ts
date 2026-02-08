import axios from 'axios';
import { toast } from 'sonner';

// Determine baseURL based on environment
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL,
    withCredentials: true, // Crucial for HttpOnly cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper to get Tenant ID (this logic might need adjustment based on how you store/retrieve the tenant)
// For now, checks localStorage.
const getTenantId = () => {
    return localStorage.getItem('tenant_id');
};

const getToken = () => {
    return localStorage.getItem('access_token');
}

api.interceptors.request.use(
    (config) => {
        // 1. Inject Authorization header if token exists
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // 2. Inject X-Tenant-Id header, BUT exclude it for Superadmin endpoints
        const tenantId = getTenantId();
        const isSuperAdminEndpoint = config.url?.startsWith('/api/v1/api/super-admin');

        if (tenantId && !isSuperAdminEndpoint) {
            config.headers['X-Tenant-Id'] = tenantId;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const detail = error.response?.data?.detail || 'An unexpected error occurred';

        if (status === 401) {
            // Unauthorized: Redirect to login or clear state
            // window.location.href = '/login'; // Or use a more React-friendly way to redirect
            toast.error('Session expired. Please log in again.');
            // Optionally clear local storage if you store generic user info there
            // localStorage.removeItem('user');
        } else if (status === 403) {
            toast.warning('You do not have permission to perform this action.');
        } else if (status >= 500) {
            toast.error(`Server Error: ${detail}`);
        } else {
            // For other errors (400, 404, etc.), you might want to handle them locally in the component
            // or show a generic toast here.
            // toast.error(detail); 
        }

        return Promise.reject(error);
    }
);
