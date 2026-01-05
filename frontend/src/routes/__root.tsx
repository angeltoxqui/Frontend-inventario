import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ToastProvider } from '../components/ui/Toast' // <--- Importamos esto

export const Route = createRootRoute({
  component: () => (
    <>
      {/* Envolvemos toda la app en el proveedor de alertas */}
      <ToastProvider>
        <Outlet />
      </ToastProvider>
      
      {/* Herramientas de desarrollo (opcional) */}
      <TanStackRouterDevtools />
    </>
  ),
})