import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. Tipado fuerte para el contexto (Mejora de Developer Experience)
interface AuthContextType {
  user: string | null;
  isAuthenticated: boolean;
  login: (username: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // 2. Inicialización perezosa (Lazy Initialization) para leer del storage al inicio
  const [user, setUser] = useState<string | null>(() => {
    return localStorage.getItem('rootventory_user');
  });

  const login = async (username: string) => {
    setUser(username);
    localStorage.setItem('access_token', 'mock-token-123');
    localStorage.setItem('rootventory_user', username); // Guardamos el usuario
    return true; 
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('rootventory_user');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, // Helper útil
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return context;
};