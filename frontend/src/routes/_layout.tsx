import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuthStore } from '../hooks/useAuth'
// Toast provider is used at the top level, not here
import { SidebarProvider, SidebarTrigger, SidebarInset } from '../components/ui/sidebar'
import AppSidebar from '../components/Sidebar/AppSidebar'
import { Separator } from '../components/ui/separator'
import { ChefHat } from 'lucide-react'
import { ModeToggle } from '../components/ModeToggle'

export const Route = createFileRoute('/_layout')({
  component: Layout,
})

function Layout() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      // Optional: Redirect to login if strictly protected
      // navigate({ to: '/login' });
    }
  }, [isAuthenticated, navigate]);

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />

      {/* Usamos bg-background y text-foreground para soportar temas */}
      <SidebarInset className="flex-1 min-w-0 min-h-screen bg-muted/20 dark:bg-slate-950 flex flex-col overflow-hidden transition-all duration-300">

        {/* HEADER ACTUALIZADO CON COLORES DINÁMICOS */}
        <header className="h-16 flex items-center px-4 sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border shadow-sm gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
            <Separator orientation="vertical" className="h-6 bg-border" />

            <div className="flex items-center gap-2 select-none">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <ChefHat className="h-5 w-5" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-bold text-lg text-foreground tracking-tight">Setoi</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Inventario</span>
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
          </div>
        </header>

        <div className="flex-1 w-full p-4 md:p-6 overflow-x-hidden">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
