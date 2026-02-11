import {
  LayoutDashboard, ShieldCheck, Store, UtensilsCrossed,
  Wallet, Settings, LogOut, BarChart3, User as UserIcon,
} from "lucide-react"
import { Link, useRouterState, useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"
// User type not needed - using AuthContext's user directly

import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarSeparator, SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

// Definimos los ítems con sus reglas de acceso
const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    // Roles que ven esto por defecto
    allowedRoles: ['admin', 'superadmin'],
    // Permiso específico que habilita esto (opcional)
    requiredPermission: null
  },
  {
    title: "Reportes",
    url: "/reports",
    icon: BarChart3,
    allowedRoles: ['admin', 'superadmin'],
    requiredPermission: null
  },
  {
    title: "Administración",
    url: "/admin",
    icon: ShieldCheck,
    allowedRoles: ['admin', 'superadmin'],
    requiredPermission: null
  },
  {
    title: "Mesero (POS)",
    url: "/pos",
    icon: Store,
    allowedRoles: ['mesero', 'admin', 'superadmin'],
    requiredPermission: 'mesero' // Si tienes este permiso en permissions[], también entras
  },
  {
    title: "Cocina",
    url: "/cocina",
    icon: UtensilsCrossed,
    allowedRoles: ['cocinero', 'admin', 'superadmin'],
    requiredPermission: 'cocinero'
  },
  {
    title: "Caja",
    url: "/caja",
    icon: Wallet,
    allowedRoles: ['cajero', 'admin', 'superadmin'],
    requiredPermission: 'cajero'
  },
  {
    title: "Configuración",
    url: "/settings",
    icon: Settings,
    allowedRoles: ['admin', 'superadmin'], // O puedes poner 'all' si todos pueden ver ajustes
    requiredPermission: null
  },
]

export default function AppSidebar() {
  const { logout, user } = useAuth()
  const router = useRouterState()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  // Lógica de filtrado
  const filteredItems = menuItems.filter(item => {
    if (!user) return false;

    // 1. Verificar si el rol principal tiene acceso
    const hasRole = item.allowedRoles.includes(user.role);

    // 2. Verificar si tiene un permiso extra explícito
    // (según tu types/index.ts, permissions es string[])
    const hasPermission = item.requiredPermission
      ? user.permissions?.includes(item.requiredPermission)
      : false;

    // 3. Admin y Superadmin ven todo (opcional, aunque ya está en allowedRoles)
    const isSuperUser = user.role === 'admin' || user.role === 'superadmin';

    return hasRole || hasPermission || isSuperUser;
  });

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border bg-sidebar">

      <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border/50">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-sidebar-foreground/60 uppercase tracking-wider">
            Menú Principal
          </span>
          <span className="text-[10px] text-muted-foreground capitalize">
            Rol: {user?.role}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {filteredItems.map((item) => {
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
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm font-bold ring-1 ring-sidebar-border"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Link to={item.url} className="flex items-center gap-3 px-2 w-full">
                        <item.icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-primary" : "text-sidebar-foreground/50")} />
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

      <SidebarFooter className="p-3 border-t border-sidebar-border/50 bg-sidebar-accent/10 backdrop-blur-sm">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/20 border border-sidebar-border/50 transition-all overflow-hidden">
              <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                <UserIcon size={16} />
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-sidebar-foreground truncate">{user?.fullName || "Usuario"}</span>
                <div className="flex items-center gap-1">
                  <span className="block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-muted-foreground font-medium truncate">
                    {user?.en_turno ? 'Turno Activo' : 'Fuera de Turno'}
                  </span>
                </div>
              </div>
            </div>
          </SidebarMenuItem>

          <SidebarSeparator className="my-2 opacity-50 bg-sidebar-border" />

          <SidebarMenuItem>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-red-500 hover:bg-red-500/10 transition-colors h-10 overflow-hidden"
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