import { api } from '../lib/axios';
import type { LoginCredentials, AuthResponse, User, RegisterCredentials } from '../types/models';

export const authService = {
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const { data } = await api.post<AuthResponse>('/api/v1/auth/login', credentials);
        return data;
    },

    register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
        const { data } = await api.post<AuthResponse>('/api/v1/auth/register', credentials);
        return data;
    },

    logout: async (): Promise<void> => {
        await api.post('/api/v1/auth/logout');
    },

    // Get current user (validates cookie session)
    me: async (): Promise<User> => {
        const { data } = await api.get<User>('/api/v1/auth/me');
        return data;
    },

    refresh: async (): Promise<void> => {
        await api.post('/api/v1/auth/refresh');
    },
};
