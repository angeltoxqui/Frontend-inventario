import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router'
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ChefHat, 
  Wallet, 
  Settings, 
  LogOut, 
  Menu,
  BarChart3,
  ShieldCheck,
  User
} from 'lucide-react'

export const Route = createFileRoute('/_layout')({
  component: Layout,
})

function Layout() {
  const { pathname } = useLocation();

  const menuItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/reports', label: 'Reportes', icon: BarChart3 }, // Nuevo
    { to: '/admin', label: 'Administración', icon: ShieldCheck },
    { to: '/pos', label: 'Mesero (POS)', icon: UtensilsCrossed },
    { to: '/cocina', label: 'Cocina', icon: ChefHat },
    { to: '/caja', label: 'Caja', icon: Wallet },
    { to: '/settings', label: 'Configuración', icon: Settings },
  ];

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* --- SIDEBAR (BARRA LATERAL) --- */}
      {/* 'fixed' la deja quieta, 'z-50' asegura que esté encima de todo */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 shadow-sm flex flex-col transition-all duration-300">
        
        {/* 1. HEADER DEL LOGO (Corrección Visual) */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2 text-slate-900">
                <div className="bg-slate-900 text-white p-1.5 rounded-lg">
                    <ChefHat size={20} strokeWidth={2.5} />
                </div>
                <span className="text-xl font-black tracking-tight">Rootventory</span>
            </div>
        </div>

        {/* 2. LISTA DE MENÚ (Scroll propio si es muy largo) */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
            <p className="px-3 text-xs font-bold text-slate-400 uppercase mb-2">Menú Principal</p>
            
            {menuItems.map((item) => (
                <Link
                    key={item.to}
                    to={item.to}
                    className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                        ${isActive(item.to) 
                            ? 'bg-slate-900 text-white shadow-md' 
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }
                    `}
                >
                    <item.icon size={18} />
                    {item.label}
                </Link>
            ))}
        </div>

        {/* 3. FOOTER DEL USUARIO (Siempre abajo) */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3 mb-3 px-2">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold border border-slate-300">
                    <User size={16}/>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">Usuario Activo</p>
                    <p className="text-xs text-slate-500 truncate">Sesión Activa</p>
                </div>
            </div>
            <button className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 p-2 rounded-lg text-sm font-bold transition-colors">
                <LogOut size={16} /> Cerrar Sesión
            </button>
        </div>
      </aside>

      {/* --- CONTENIDO PRINCIPAL --- */}
      {/* 'pl-64' empuja el contenido para que no quede detrás del sidebar */}
      <main className="flex-1 pl-64 w-full">
         {/* Un contenedor interno para dar márgenes a las páginas */}
         <div className="min-h-screen w-full">
            <Outlet />
         </div>
      </main>

    </div>
  )
}