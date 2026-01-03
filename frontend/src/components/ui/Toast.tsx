import React, { createContext, useContext } from 'react';

const ToastContext = createContext<any>(null);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const toast = (message: string, type: 'success' | 'error' | 'info') => {
    alert(`[${type.toUpperCase()}] ${message}`); // Implementación simple para empezar
    // Aquí podrías integrar "sonner" o "react-hot-toast" para algo más bonito
  };
  return <ToastContext.Provider value={{ toast }}>{children}</ToastContext.Provider>;
};

export const useToast = () => useContext(ToastContext);