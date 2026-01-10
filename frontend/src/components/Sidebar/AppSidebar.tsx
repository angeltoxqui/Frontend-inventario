import { 
  LayoutDashboard, 
  ShieldCheck, 
  Store, 
  UtensilsCrossed, 
  Wallet, 
  Settings, 
  LogOut,
  BarChart3,
  User as UserIcon,
} from "lucide-react"
// 1. IMPORTAR useNavigate AQUÍ 👇
import { Link, useRouterState, useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Reportes", url: "/reports", icon: BarChart3 },
  { title: "Administración", url: "/admin", icon: ShieldCheck },
  { title: "Mesero (POS)", url: "/pos", icon: Store },
  { title: "Cocina", url: "/cocina", icon: UtensilsCrossed },
  { title: "Caja", url: "/caja", icon: Wallet },
  { title: "Configuración", url: "/settings", icon: Settings },
]

export default function AppSidebar() {
  const { logout, user } = useAuth()
  const router = useRouterState() 
  // 2. INICIALIZAR EL HOOK DE NAVEGACIÓN 👇
  const navigate = useNavigate()

  // 3. CREAR FUNCIÓN PARA MANEJAR EL LOGOUT 👇
  const handleLogout = () => {
    logout() // Limpia el estado
    navigate({ to: '/login' }) // Redirige al usuario
  }

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-slate-200 bg-sidebar">
      
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border/50">
         <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Menú Principal
         </span>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {/* ... (El contenido del menú sigue igual) ... */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {items.map((item) => {
                 const isActive = item.url === "/" 
                    ? router.location.pathname === "/" 
                    : router.location.pathname.startsWith(item.url);

                 return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      tooltip={item.title}
                      isActive={isActive}
                      className={cn(
                        "h-10 w-full justify-start rounded-lg transition-all duration-200",
                        isActive 
                          ? "bg-white text-slate-900 shadow-sm border border-slate-200 font-bold ring-1 ring-slate-100" 
                          : "text-slate-500 hover:bg-white hover:text-slate-900 hover:border hover:border-slate-100"
                      )}
                    >
                      <Link to={item.url} className="flex items-center gap-3 px-2 w-full">
                        <item.icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-blue-600" : "text-slate-400")} />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                 )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border/50 bg-white/50 backdrop-blur-sm">
        <SidebarMenu>
          <SidebarMenuItem>
             <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100 transition-all overflow-hidden">
                <div className="h-9 w-9 shrink-0 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
                  <UserIcon size={16} />
                </div>
                
                <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-slate-700 truncate">{user || "Usuario"}</span>
                    <span className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                      <span className="block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"/> En línea
                    </span>
                </div>
             </div>
          </SidebarMenuItem>
          
          <SidebarSeparator className="my-2 opacity-50"/>

          <SidebarMenuItem>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors h-10 overflow-hidden"
              // 4. USAR LA NUEVA FUNCIÓN AQUÍ 👇
              onClick={handleLogout}
            >
              <LogOut size={18} className="shrink-0" />
              <span className="font-medium">Cerrar Sesión</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}