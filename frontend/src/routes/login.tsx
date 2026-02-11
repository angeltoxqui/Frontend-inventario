import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useState } from 'react';
import { useAuthStore } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { ChefHat, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/login')({
  component: Login,
})

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsSubmitting(true);

    try {
      const { session, user } = await authService.login({ email, password });

      if (!session) throw new Error('No session created');

      const token = session.access_token;

      // For now, use a default tenant or one from env as per guide recommendation for dev
      // In a real multi-tenant app, this might come from user metadata or a separate selection screen
      const defaultTenant = import.meta.env.VITE_DEFAULT_TENANT || 'tenant_000001';

      // Update Zustand Store
      setAuth({
        user_id: user?.id || '',
        email: user?.email,
        role: 'admin' // defaulting role for now, should come from metadata
      }, token);

      // We also need to set the tenant in the store/axios
      // The useAuthStore has setTenant method? Let's check. Yes it does.
      const { setTenant } = useAuthStore.getState();
      setTenant(defaultTenant);

      toast.success('Bienvenido de nuevo');
      navigate({ to: '/' });

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
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
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium placeholder:text-muted-foreground border-input"
              placeholder="admin@example.com"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-medium placeholder:text-muted-foreground border-input"
              placeholder="••••••••"
            />
          </div>

          <div className="bg-muted/50 p-4 rounded-xl text-xs text-muted-foreground border border-border">
            <p className="font-bold mb-2 text-foreground uppercase opacity-70">Usuarios Demo:</p>
            <ul className="space-y-1">
              <li className="flex justify-between"><span>👑 Owner:</span> <code className="bg-primary/10 text-primary px-1 rounded font-bold">owner@setoi.com / 12345678</code></li>
              <li className="flex justify-between"><span>🛡️ Admin:</span> <code className="bg-muted px-1 rounded font-bold text-foreground">admin@demo.com / 12345678</code></li>
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
