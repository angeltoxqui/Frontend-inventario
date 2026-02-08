import { api } from '../lib/axios';
import type { Tenant, CreateStoreDTO } from '../types/api';

// Nota: Prefijo doble /api/v1/api/ según documentación
const BASE_SA = '/api/v1/api/super-admin';
const BASE_TENANT_USERS = '/api/v1/api/tenant-users';

export const adminService = {
    // --- Stores ---
    getStores: async () => {
        const { data } = await api.get<Tenant[]>(`${BASE_SA}/stores/`);
        return data;
    },

    createStore: async (store: CreateStoreDTO) => {
        const { data } = await api.post<Tenant>(`${BASE_SA}/stores/`, store);
        return data;
    },

    updateStoreStatus: async (tenantId: string, status: 'active' | 'suspended') => {
        const { data } = await api.patch(`${BASE_SA}/stores/${tenantId}/status`, { status });
        return data;
    },

    // --- Tenant Users Management ---
    addUserToTenant: async (tenantId: string, userData: { user_email: string; role: string }) => {
        const { data } = await api.post(`${BASE_TENANT_USERS}/${tenantId}/users/`, userData);
        return data;
    },
};
