import { api } from '../lib/axios';
import type { LoginResponse, User } from '../types/api';

export const authService = {
    login: async (credentials: { email: string; password: string }) => {
        const { data } = await api.post<LoginResponse>('/api/v1/auth/login', credentials);
        return data;
    },

    register: async (credentials: { email: string; password: string }) => {
        const { data } = await api.post<{ message: string; user_id: string }>('/api/v1/auth/register', credentials);
        return data;
    },

    logout: async () => {
        const { data } = await api.post<{ message: string }>('/api/v1/auth/logout');
        return data;
    },

    refresh: async () => {
        const { data } = await api.post<{ message: string; user_id: string }>('/api/v1/auth/refresh');
        return data;
    },

    me: async () => {
        const { data } = await api.get<User>('/api/v1/auth/me');
        return data;
    },
};
