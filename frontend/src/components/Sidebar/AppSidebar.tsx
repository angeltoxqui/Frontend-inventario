import { 
  LayoutDashboard, 
  ShieldCheck, 
  Store, 
  UtensilsCrossed, 
  Wallet, 
  Settings, 
  LogOut,
  BarChart3 
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

// --- AQUÍ ESTABA EL ERROR, ESTA ES LA LÍNEA CORREGIDA: ---
import { useAuth } from "@/context/AuthContext" 
// ---------------------------------------------------------

// Menú de navegación principal
const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Reportes", 
    url: "/reports",
    icon: BarChart3,
  },
  {
    title: "Administración",
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
  const router = useRouterState() // Para detectar ruta activa

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
                    // Resaltar activo si la URL actual empieza con la url del item
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
             <div className="flex flex-col gap-2 px-2 mb-2 group-data-[collapsible=icon]:hidden">
                {/* Mostramos el nombre del usuario o 'Usuario' si es null */}
                <span className="text-sm font-medium truncate">{user || "Usuario"}</span>
                <span className="text-xs text-muted-foreground truncate capitalize">Sesión Activa</span>
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