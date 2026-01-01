import { 
  LayoutDashboard, 
  ShieldCheck, 
  Store, 
  UtensilsCrossed, 
  Wallet, 
  Settings, 
  LogOut 
} from "lucide-react"
import { Link, useRouterState } from "@tanstack/react-router"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"

// Menú de navegación principal
const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Administración", // Panel Unificado (RRHH, Inventario, Mesas)
    url: "/admin",
    icon: ShieldCheck,
  },
  {
    title: "Mesero (POS)",
    url: "/pos",
    icon: Store,
  },
  {
    title: "Cocina",
    url: "/cocina",
    icon: UtensilsCrossed,
  },
  {
    title: "Caja",
    url: "/caja",
    icon: Wallet,
  },
  {
    title: "Configuración",
    url: "/settings",
    icon: Settings,
  },
]

export default function AppSidebar() {
  const { logout, user } = useAuth()
  const router = useRouterState() // Para detectar ruta activa si es necesario

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2 font-bold text-xl px-2">
          <span className="text-primary">Gastro</span>Pro
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    tooltip={item.title}
                    // Resaltar activo si la URL actual empieza con la url del item (excepto dashboard que es exacta)
                    isActive={
                      item.url === "/" 
                        ? router.location.pathname === "/" 
                        : router.location.pathname.startsWith(item.url)
                    }
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
             <div className="flex flex-col gap-2 px-2 mb-2">
                <span className="text-sm font-medium truncate">{user?.full_name || "Usuario"}</span>
                <span className="text-xs text-muted-foreground truncate capitalize">{user?.role || "Sin Rol"}</span>
             </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button 
              variant="destructive" 
              className="w-full justify-start gap-2" 
              onClick={logout}
            >
              <LogOut size={16} />
              <span className="group-data-[collapsible=icon]:hidden">Cerrar Sesión</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}