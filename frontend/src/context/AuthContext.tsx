import React, { createContext, useContext, useState, useEffect } from 'react';
import { MockService } from '../services/mockService'; // Importamos el servicio
import { User } from '../types/legacy'; // Uses legacy User type (has id, username, fullName)

interface AuthContextType {
  user: User | null; // Ahora guardamos el objeto completo
  isAuthenticated: boolean;
  login: (username: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>; // Nueva función para recargar permisos sin salir
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar usuario al iniciar la app
  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const refreshUser = async () => {
    const storedUsername = localStorage.getItem('rootventory_user');
    if (storedUsername) {
      try {
        const users = await MockService.getUsers();
        const found = users.find(u => u.username === storedUsername);
        if (found) setUser(found);
      } catch (error) {
        console.error("Error recargando usuario:", error);
      }
    }
  };

  const login = async (username: string) => {
    try {
      const users = await MockService.getUsers();
      const found = users.find(u => u.username === username);

      if (found) {
        setUser(found);
        localStorage.setItem('access_token', 'mock-token-123');
        localStorage.setItem('rootventory_user', username);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('rootventory_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      refreshUser
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return context;
};