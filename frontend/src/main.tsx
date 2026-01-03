import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import './index.css'

// IMPORTANTE: Importamos los proveedores que faltaban
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/ui/Toast'

// Configuración de TanStack Query
const queryClient = new QueryClient()

// Configuración del Router
const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: 'intent',
  // Esto hace que el scroll vuelva arriba al cambiar de página
  scrollRestoration: true,
})

// Registrar el router para tipos seguros
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')!

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      {/* 1. Proveedor de Datos (Backend Mock/Real) */}
      <QueryClientProvider client={queryClient}>
        
        {/* 2. Proveedor de Autenticación (Login) */}
        <AuthProvider>
          
          {/* 3. Proveedor de Notificaciones (Toasts) */}
          <ToastProvider>
            
            {/* 4. La Aplicación (Router) */}
            <RouterProvider router={router} />
            
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  )
}