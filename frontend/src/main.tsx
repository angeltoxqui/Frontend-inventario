import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import './index.css'

// IMPORTANTE: Importamos los proveedores
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/ui/Toast'
import { ThemeProvider } from './components/theme-provider' // <--- 1. IMPORTAR ESTO

// Configuración de TanStack Query
const queryClient = new QueryClient()

// Configuración del Router
const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
})

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
      {/* 1. Proveedor de Datos */}
      <QueryClientProvider client={queryClient}>
        
        {/* 2. Proveedor de Tema (ESTO FALTABA) */}
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
          
          {/* 3. Proveedor de Autenticación */}
          <AuthProvider>
            
            {/* 4. Proveedor de Notificaciones */}
            <ToastProvider>
              
              {/* 5. La Aplicación */}
              <RouterProvider router={router} />
              
            </ToastProvider>
          </AuthProvider>
          
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  )
}