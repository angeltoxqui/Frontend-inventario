import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChefHat, Loader2, Globe } from 'lucide-react';

export const Route = createFileRoute('/login')({
  component: Login,
})

function Login() {
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsSubmitting(true);
    
    // Login con el contexto
    const success = await login(username);
    
    if (success) {
        let target = '/admin'; // Default
        
        // Redirecciones según usuario (Hardcoded para demo)
        if (username === 'owner') target = '/super-admin'; // NUEVO
        if (username === 'juan') target = '/pos';
        if (username === 'maria') target = '/cocina';
        if (username === 'pedro') target = '/caja';
        if (username === 'admin') target = '/admin';
        
        // Navegación
        navigate({ to: target });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-slate-900 p-4 rounded-full mb-4 shadow-lg">
            <ChefHat className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Setoi</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Sistema de Gestión para Restaurantes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
              Usuario de Acceso
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`
                w-full px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white
                focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all font-medium
                ${!username && isSubmitting ? 'border-red-500' : 'border-gray-200'}
              `}
              placeholder="Ej: admin, owner, juan..."
              autoFocus
            />
            {!username && isSubmitting && (
              <span className="text-xs text-red-500 mt-1 block font-bold">Campo requerido</span>
            )}
          </div>

          <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-600 border border-slate-100">
            <p className="font-bold mb-2 text-slate-400 uppercase">Usuarios Demo Disponibles:</p>
            <ul className="space-y-1">
              <li className="flex justify-between"><span>👑 Super Admin (Dueño):</span> <code className="bg-indigo-100 text-indigo-700 px-1 rounded font-bold">owner</code></li>
              <li className="flex justify-between"><span>🛡️ Admin Tienda:</span> <code className="bg-slate-200 px-1 rounded font-bold">admin</code></li>
              <li className="flex justify-between"><span>🍽️ Mesero:</span> <code className="bg-slate-200 px-1 rounded font-bold">juan</code></li>
              <li className="flex justify-between"><span>👨‍🍳 Cocina:</span> <code className="bg-slate-200 px-1 rounded font-bold">maria</code></li>
              <li className="flex justify-between"><span>💰 Caja:</span> <code className="bg-slate-200 px-1 rounded font-bold">pedro</code></li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all active:scale-95 flex justify-center items-center shadow-xl shadow-slate-200"
          >
            {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              "Ingresar al Sistema"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};