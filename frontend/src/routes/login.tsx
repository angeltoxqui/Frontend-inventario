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
        if (username === 'owner') target = '/super-admin'; 
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
    // [CORRECCIÓN] Fondo bg-muted/40 para dark mode
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      {/* [CORRECCIÓN] Tarjeta con bg-card */}
      <div className="bg-card text-card-foreground p-8 rounded-2xl shadow-xl w-full max-w-md border border-border">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary p-4 rounded-full mb-4 shadow-lg text-primary-foreground">
            <ChefHat className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Setoi</h1>
          <p className="text-muted-foreground text-sm mt-1 font-medium">Sistema de Gestión para Restaurantes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide">
              Usuario de Acceso
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`
                w-full px-4 py-3 rounded-xl border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-medium placeholder:text-muted-foreground
                ${!username && isSubmitting ? 'border-destructive' : 'border-input'}
              `}
              placeholder="Ej: admin, owner, juan..."
              autoFocus
            />
            {!username && isSubmitting && (
              <span className="text-xs text-destructive mt-1 block font-bold">Campo requerido</span>
            )}
          </div>

          <div className="bg-muted/50 p-4 rounded-xl text-xs text-muted-foreground border border-border">
            <p className="font-bold mb-2 text-foreground uppercase opacity-70">Usuarios Demo Disponibles:</p>
            <ul className="space-y-1">
              <li className="flex justify-between"><span>👑 Super Admin (Dueño):</span> <code className="bg-primary/10 text-primary px-1 rounded font-bold">owner</code></li>
              <li className="flex justify-between"><span>🛡️ Admin Tienda:</span> <code className="bg-muted px-1 rounded font-bold text-foreground">admin</code></li>
              <li className="flex justify-between"><span>🍽️ Mesero:</span> <code className="bg-muted px-1 rounded font-bold text-foreground">juan</code></li>
              <li className="flex justify-between"><span>👨‍🍳 Cocina:</span> <code className="bg-muted px-1 rounded font-bold text-foreground">maria</code></li>
              <li className="flex justify-between"><span>💰 Caja:</span> <code className="bg-muted px-1 rounded font-bold text-foreground">pedro</code></li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-lg hover:bg-primary/90 transition-all active:scale-95 flex justify-center items-center shadow-lg"
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
}