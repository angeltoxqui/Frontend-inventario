import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ThemeProvider } from "@/components/theme-provider"
import { AppSidebar } from "@/components/Sidebar/AppSidebar" // Si usas el sidebar nuevo
// O los componentes que estés usando para el layout base

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      {/* El ThemeProvider debe envolver TODO */}
      <div className="min-h-screen bg-background text-foreground font-sans antialiased">
        <Outlet />
      </div>
      <TanStackRouterDevtools />
    </ThemeProvider>
  ),
})
