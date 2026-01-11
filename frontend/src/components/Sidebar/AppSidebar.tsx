import { 
  LayoutDashboard, ShieldCheck, Store, UtensilsCrossed, 
  Wallet, Settings, LogOut, BarChart3, User as UserIcon,
} from "lucide-react"
import { Link, useRouterState, useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"

import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarSeparator, SidebarRail,
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
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border bg-sidebar">
      
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border/50">
         <span className="text-xs font-bold text-sidebar-foreground/60 uppercase tracking-wider">
            Menú Principal
         </span>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
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
                        // [CORRECCIÓN] Usamos variables semánticas (sidebar-accent) en lugar de colores fijos
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
                    <span className="text-sm font-bold text-sidebar-foreground truncate">{user || "Usuario"}</span>
                    <span className="text-[10px] text-green-500 font-medium flex items-center gap-1">
                      <span className="block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"/> En línea
                    </span>
                </div>
             </div>
          </SidebarMenuItem>
          
          <SidebarSeparator className="my-2 opacity-50 bg-sidebar-border"/>

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