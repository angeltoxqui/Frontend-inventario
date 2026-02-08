import { api } from '../lib/axios';
import type {
    Tenant,
    CreateStoreDTO,
    TenantUser,
    CreateTenantUserDTO
} from '../types/models';

export const adminService = {
    // --- Stores (Superadmin) ---

    /**
     * List all stores (tenants).
     * Note: This endpoint is for Superadmins only.
     */
    getStores: async (): Promise<Tenant[]> => {
        const response = await api.get<Tenant[]>('/api/v1/api/super-admin/stores/');
        return response.data;
    },

    /**
     * Create a new store (tenant).
     */
    createStore: async (data: CreateStoreDTO): Promise<Tenant> => {
        const response = await api.post<Tenant>('/api/v1/api/super-admin/stores/', data);
        return response.data;
    },

    /**
     * Update store status (e.g., suspend/activate).
     */
    updateStoreStatus: async (tenantId: string, status: 'active' | 'suspended'): Promise<{ ok: boolean }> => {
        const response = await api.patch<{ ok: boolean }>(`/api/v1/api/super-admin/stores/${tenantId}/status`, { status });
        return response.data;
    },

    // --- Tenant Users (Global) ---

    /**
     * List users for a specific tenant.
     */
    getTenantUsers: async (tenantId: string): Promise<TenantUser[]> => {
        const response = await api.get<TenantUser[]>(`/api/v1/api/tenant-users/${tenantId}/users/`);
        return response.data;
    },

    /**
     * Assign a user to a tenant.
     */
    assignUserToTenant: async (tenantId: string, data: CreateTenantUserDTO): Promise<TenantUser> => {
        const response = await api.post<TenantUser>(`/api/v1/api/tenant-users/${tenantId}/users/`, data);
        // Note: The response structure for assignUserToTenant in docs:
        // { user_id, tenant_id, email, role, assigned_at, assigned_by }
        // which matches TenantUser interface roughly.
        return response.data;
    },

    /**
     * Remove a user from a tenant.
     */
    removeUserFromTenant: async (tenantId: string, userId: string): Promise<{ ok: boolean }> => {
        // Note: The docs show DELETE returns { ok: true } (implied standard response for delete if not specified otherwise in global errors)
        // Actually docs don't specify body for DELETE, usually it's empty or success message.
        await api.delete(`/api/v1/api/tenant-users/${tenantId}/users/${userId}`);
        return { ok: true };
    },

    /**
     * Change user role in a tenant.
     */
    updateUserRole: async (tenantId: string, userId: string, role: string): Promise<{ ok: boolean }> => { // docs say patch returns... actually example response is missing in docs, assuming standard success.
        await api.patch(`/api/v1/api/tenant-users/${tenantId}/users/${userId}/role`, { role });
        return { ok: true };
    }
};
