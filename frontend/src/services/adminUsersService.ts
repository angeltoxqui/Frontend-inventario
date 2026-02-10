import { api } from '../lib/axios';

// Usuarios internos del POS (mesero, cocinero, cajero)
// Endpoints 41-43: /api/v1/admin/users/

export interface POSUser {
    id: number;
    username: string;
    rol: 'admin' | 'mesero' | 'cocinero' | 'cajero';
}

export interface CreatePOSUserDTO {
    username: string;
    password: string;
    rol: 'admin' | 'mesero' | 'cocinero' | 'cajero';
}

export const adminUsersService = {
    /**
     * Endpoint 42: Listar usuarios internos del tenant
     */
    getUsers: async (): Promise<POSUser[]> => {
        const { data } = await api.get<POSUser[]>('/api/v1/admin/users/');
        return data;
    },

    /**
     * Endpoint 41: Crear usuario interno del tenant
     */
    createUser: async (userData: CreatePOSUserDTO): Promise<POSUser> => {
        const { data } = await api.post<POSUser>('/api/v1/admin/users/', userData);
        return data;
    },

    /**
     * Endpoint 43: Eliminar usuario del tenant
     * No se puede eliminar el usuario "admin"
     */
    deleteUser: async (userId: number): Promise<{ ok: boolean }> => {
        const { data } = await api.delete<{ ok: boolean }>(`/api/v1/admin/users/${userId}`);
        return data;
    },
};
