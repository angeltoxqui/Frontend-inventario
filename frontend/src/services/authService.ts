import type { AxiosResponse } from 'axios';
import { api } from '../lib/axios';
import type { LoginCredentials, RegisterCredentials, AuthResponse, User } from '../types/models';

export const authService = {
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('/api/v1/auth/login', credentials);
        return response.data;
    },

    register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('/api/v1/auth/register', credentials);
        return response.data;
    },

    logout: async (): Promise<{ message: string }> => {
        const response = await api.post<{ message: string }>('/api/v1/auth/logout');
        return response.data;
    },

    refreshToken: async (): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('/api/v1/auth/refresh');
        return response.data;
    },

    me: async (): Promise<User> => {
        const response = await api.get<User>('/api/v1/auth/me');
        return response.data;
    },
};
