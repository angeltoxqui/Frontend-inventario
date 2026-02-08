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
      const response = await authService.login({ email, password });
      // Assuming response has { message, user_id, access_token? }
      // We need to fetch the full user object or construct it
      // The service 'me' endpoint returns User.

      // Let's store token if present
      if ((response as any).access_token) {
        localStorage.setItem('auth_token', (response as any).access_token);
      }

      // Fetch user details immediately to populate store
      const user = await authService.me();
      const token = (response as any).access_token || null;

      setAuth({ id: user.user_id }, token);
      toast.success('Bienvenido de nuevo');

      // Redirect logic
      // If we had role in user object, we could route better.
      // For now default to /admin or root
      navigate({ to: '/' });

    } catch (error: any) {
      console.error(error);
      // Toast is handled by axios interceptor usually, but safe to add if not
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
