import { api } from '../lib/axios';
import type { Tenant, CreateStoreDTO, SuperAdminUser } from '../types/api';
import type { TenantUser, CreateTenantUserDTO } from '../types/models';

// Configured according to the Integration Guide
const BASE_SA = '/api/v1/super-admin';
const BASE_TENANT_USERS = '/api/v1/tenant-users';

export const adminService = {
    // --- Stores ---
    getStores: async () => {
        const { data } = await api.get<Tenant[]>(`${BASE_SA}/stores`);
        return data;
    },

    createStore: async (store: CreateStoreDTO) => {
        const { data } = await api.post<Tenant>(`${BASE_SA}/stores`, store);
        return data;
    },

    // Note: This endpoint wasn't explicitly in the guide but implied for management. 
    // Keeping if backend supports it, or it might fail if 404. 
    // The guide mentions POST /super-admin/stores and GET. 
    updateStoreStatus: async (tenantId: string, status: 'active' | 'suspended') => {
        const { data } = await api.patch(`${BASE_SA}/stores/${tenantId}/status`, { status });
        return data;
    },

    // --- Superadmins ---
    // Not explicitly in the abridged guide but standard for admin panels.
    getSuperadmins: async () => {
        const { data } = await api.get<SuperAdminUser[]>(`${BASE_SA}/superadmins`);
        return data;
    },

    createSuperadmin: async (email: string) => {
        const { data } = await api.post(`${BASE_SA}/superadmins`, { email });
        return data;
    },

    // --- Tenant Users Management ---
    getTenantUsers: async (tenantId: string) => {
        const { data } = await api.get<TenantUser[]>(`${BASE_TENANT_USERS}/${tenantId}/users`);
        return data;
    },

    assignUserToTenant: async (tenantId: string, userData: CreateTenantUserDTO) => {
        const { data } = await api.post(`${BASE_TENANT_USERS}/${tenantId}/users`, userData);
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
