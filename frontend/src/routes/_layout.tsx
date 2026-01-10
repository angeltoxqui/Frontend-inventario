import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { MockService } from '../services/mockService'
import { User } from '../types'
import { useToast } from '../components/ui/Toast'
import { SidebarProvider, SidebarTrigger, SidebarInset } from '../components/ui/sidebar'
import AppSidebar from '../components/Sidebar/AppSidebar'
import { Separator } from '../components/ui/separator'
import { ChefHat } from 'lucide-react'

export const Route = createFileRoute('/_layout')({
  component: Layout,
})

function Layout() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast(); 

  useEffect(() => {
    const loadUser = async () => {
        try {
            const users = await MockService.getUsers();
            const storedUser = localStorage.getItem('rootventory_user') || 'admin'; 
            const found = users.find(u => u.username === storedUser);
            setCurrentUser(found || users[0]);
        } catch (e) { console.error(e); }
    };
    loadUser();
  }, []);

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      
      {/* ELIMINADO 'w-full' para evitar conflictos de ancho. flex-1 es suficiente. */}
      <SidebarInset className="flex-1 min-w-0 min-h-screen bg-slate-50/50 flex flex-col overflow-hidden transition-all duration-300">
         
         {/* HEADER */}
         <header className="h-16 flex items-center px-4 sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm gap-4 shrink-0">
            <div className="flex items-center gap-3">
                <SidebarTrigger className="text-slate-500 hover:text-slate-900 transition-colors" />
                <Separator orientation="vertical" className="h-6 bg-slate-200" />
                
                <div className="flex items-center gap-2 select-none">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
                        <ChefHat className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="font-bold text-lg text-slate-900 tracking-tight">Setoi</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest"></span>
                    </div>
                </div>
            </div>
         </header>

         <div className="flex-1 w-full p-4 md:p-6 overflow-x-hidden">
            <Outlet />
         </div>
      </SidebarInset>
    </SidebarProvider>
  )
}