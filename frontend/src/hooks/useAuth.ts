import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { User } from '../types/api';

interface AuthState {
  user: User | null;
  token: string | null;
  tenantId: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token?: string) => void;
  setTenant: (tenantId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      tenantId: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token: token || null, isAuthenticated: true }),
      setTenant: (tenantId) => set({ tenantId }),
      logout: () => set({ user: null, token: null, tenantId: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
