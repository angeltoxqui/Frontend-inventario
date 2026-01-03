import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { ChefHat, Loader2 } from 'lucide-react';

// --- ESTO ES LO QUE FALTABA ---
export const Route = createFileRoute('/login')({
  component: Login,
})
// ------------------------------

function Login() {
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate(); // Usar el hook de TanStack Router

  // Role Redirection Map
  const roleRedirects: Record<UserRole, string> = {
    [UserRole.ADMIN]: '/admin',
    [UserRole.MESERO]: '/pos',
    [UserRole.COCINERO]: '/cocina',
    [UserRole.CAJERO]: '/caja'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsSubmitting(true);
    
    // Simulación de login exitoso
    const success = await login(username);
    
    if (success) {
        let target = '/admin';
        if (username === 'juan') target = '/pos';
        if (username === 'maria') target = '/cocina';
        if (username === 'pedro') target = '/caja';
        if (username === 'admin') target = '/admin';
        
        // Navegación correcta con TanStack Router
        navigate({ to: target });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-orange-100 p-4 rounded-full mb-4">
            <ChefHat className="w-10 h-10 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Rootventory</h1>
          <p className="text-gray-500 text-sm mt-1">Identifícate para iniciar turno</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`
                w-full px-4 py-3 rounded-lg border bg-gray-50 focus:bg-white
                focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all
                ${!username && isSubmitting ? 'border-red-500' : 'border-gray-200'}
              `}
              placeholder="Ej: juan"
            />
            {!username && isSubmitting && (
              <span className="text-xs text-red-500 mt-1 block">Requerido</span>
            )}
          </div>

          <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
            <p className="font-semibold mb-1">Usuarios Demo:</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
              <li>admin (Admin)</li>
              <li>juan (Mesero)</li>
              <li>maria (Cocina)</li>
              <li>pedro (Caja)</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors flex justify-center items-center shadow-lg shadow-slate-900/20"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Iniciar Turno"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};