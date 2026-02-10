import { api } from '../lib/axios';
import type { Tenant, CreateStoreDTO, SuperAdminUser } from '../types/api';
import type { TenantUser, CreateTenantUserDTO } from '../types/models';

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

    // --- Superadmins ---
    getSuperadmins: async () => {
        const { data } = await api.get<SuperAdminUser[]>(`${BASE_SA}/superadmins/`);
        return data;
    },

    createSuperadmin: async (email: string) => {
        const { data } = await api.post(`${BASE_SA}/superadmins/`, { email });
        return data;
    },

    // --- Tenant Users Management ---
    getTenantUsers: async (tenantId: string) => {
        const { data } = await api.get<TenantUser[]>(`${BASE_TENANT_USERS}/${tenantId}/users/`);
        return data;
    },

    assignUserToTenant: async (tenantId: string, userData: CreateTenantUserDTO) => {
        const { data } = await api.post(`${BASE_TENANT_USERS}/${tenantId}/users/`, userData);
        return data;
    },

    removeUserFromTenant: async (tenantId: string, userId: string) => {
        const { data } = await api.delete(`${BASE_TENANT_USERS}/${tenantId}/users/${userId}`);
        return data;
    },

    updateUserRole: async (tenantId: string, userId: string, role: string) => {
        const { data } = await api.patch(`${BASE_TENANT_USERS}/${tenantId}/users/${userId}/role`, { role });
        return data;
    },
};
