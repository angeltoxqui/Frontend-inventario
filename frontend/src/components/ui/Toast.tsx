import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// Tipos de alerta
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de un ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Función para lanzar la alerta (compatible con tu código actual)
  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-eliminar después de 4 segundos
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* CONTENEDOR DE POP-UPS (Fijo a la derecha arriba) */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              pointer-events-auto relative overflow-hidden w-80 bg-white rounded-xl shadow-2xl border-l-4 flex items-start gap-3 p-4
              transform transition-all duration-300 ease-out animate-in slide-in-from-right-full fade-in
              ${t.type === 'success' ? 'border-green-500' : ''}
              ${t.type === 'error' ? 'border-red-500' : ''}
              ${t.type === 'warning' ? 'border-orange-500' : ''}
              ${t.type === 'info' ? 'border-blue-500' : ''}
            `}
          >
            {/* Icono Dinámico */}
            <div className="mt-0.5 shrink-0">
              {t.type === 'success' && <CheckCircle2 className="text-green-500 h-6 w-6" />}
              {t.type === 'error' && <XCircle className="text-red-500 h-6 w-6" />}
              {t.type === 'warning' && <AlertTriangle className="text-orange-500 h-6 w-6" />}
              {t.type === 'info' && <Info className="text-blue-500 h-6 w-6" />}
            </div>

            {/* Contenido */}
            <div className="flex-1">
              <h4 className={`font-bold text-sm capitalize ${
                 t.type === 'success' ? 'text-green-800' : 
                 t.type === 'error' ? 'text-red-800' : 
                 t.type === 'warning' ? 'text-orange-800' : 'text-blue-800'
              }`}>
                {t.type === 'success' ? '¡Éxito!' : 
                 t.type === 'error' ? 'Error' : 
                 t.type === 'warning' ? 'Cuidado' : 'Información'}
              </h4>
              <p className="text-sm text-slate-600 font-medium leading-tight mt-1">
                {t.message}
              </p>
            </div>

            {/* Botón Cerrar */}
            <button 
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={16} />
            </button>

            {/* Barra de Progreso (Animación CSS pura) */}
            <div className={`absolute bottom-0 left-0 h-1 w-full opacity-20 ${
                t.type === 'success' ? 'bg-green-500' : 
                t.type === 'error' ? 'bg-red-500' : 
                t.type === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
            }`}>
                <div className="h-full bg-current w-full origin-left animate-[shrink_4s_linear_forwards]" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Estilos para la animación de la barra */}
      <style>{`
        @keyframes shrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};