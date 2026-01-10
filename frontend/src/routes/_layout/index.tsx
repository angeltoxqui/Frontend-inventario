import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { MockService } from '@/services/mockService'
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  ArrowUpRight, 
  AlertCircle,
  TrendingUp,
  Utensils,
  FileText,
  Settings,
  Package,
  Briefcase
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_layout/')({
  component: Dashboard,
})

function Dashboard() {
  const [stats, setStats] = useState({ income: 0, orders: 0, activeTables: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const fin = await MockService.getFinancialData();
        const tables = await MockService.getTables();
        const busy = tables.filter(t => t.status !== 'libre').length;
        setStats({
          income: fin.totalIncome,
          orders: fin.todaySales.length,
          activeTables: busy
        });
      } catch (error) {
        console.error("Error cargando dashboard", error);
      }
    };
    load();
  }, []);

  // BOTONES CON RUTAS INTELIGENTES
  const quickLinks = [
    { title: 'Reportes', url: '/reports', icon: FileText },
    // Envía ?tab=users para abrir directo en RRHH
    { title: 'RRHH', url: '/admin?tab=users', icon: Briefcase }, 
    // Envía ?view=insumos para filtrar la tabla
    { title: 'Insumos', url: '/items?view=insumos', icon: Package }, 
    { title: 'Ajustes', url: '/settings', icon: Settings },
  ];

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Dashboard General</h1>
          <p className="text-slate-500 mt-2 text-lg">Bienvenido de nuevo. Aquí tienes el pulso de tu restaurante hoy.</p>
        </div>
        <div className="flex gap-3">
           <Link to="/reports">
             <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/10">
               <TrendingUp className="mr-2 h-4 w-4" /> Ver Reportes
             </Button>
           </Link>
           <Link to="/cocina">
             <Button className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">
               <Utensils className="mr-2 h-4 w-4" /> Ir a Cocina
             </Button>
           </Link>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-primary/20 bg-white/80 backdrop-blur shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <DollarSign size={80} className="text-primary" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-slate-500">
              Ingresos Totales
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
               <DollarSign size={18} />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-slate-900 mt-2">${stats.income.toLocaleString()}</div>
            <p className="text-xs text-primary font-medium mt-1 flex items-center">
              <ArrowUpRight size={14} className="mr-1" /> +12% vs ayer
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-white/80 backdrop-blur shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <ShoppingBag size={80} />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-slate-500">
              Pedidos Hoy
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
               <ShoppingBag size={18} />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-slate-900 mt-2">{stats.orders}</div>
            <p className="text-xs text-slate-500 mt-1">
              Promedio de 15 mins/mesa
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-100 bg-white/80 backdrop-blur shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <Users size={80} className="text-orange-500" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-slate-500">
              Ocupación
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
               <Users size={18} />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-slate-900 mt-2">{stats.activeTables} / 9</div>
            {stats.activeTables > 7 ? (
                <p className="text-xs text-orange-600 font-bold mt-1 flex items-center bg-orange-50 w-fit px-2 py-0.5 rounded-full">
                  <AlertCircle size={12} className="mr-1" /> Alta demanda
                </p>
            ) : (
                <p className="text-xs text-slate-500 mt-1">Capacidad saludable</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Gestión Rápida</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {quickLinks.map((item, i) => (
               <Link 
                  key={i} 
                  to={item.url}
                  className="group p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-between shadow-sm hover:shadow-md"
               >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <item.icon size={16} />
                    </div>
                    <span className="font-medium text-slate-700 group-hover:text-primary transition-colors">{item.title}</span>
                  </div>
                  <ArrowUpRight size={16} className="text-slate-300 group-hover:text-primary transition-colors" />
               </Link>
             ))}
        </div>
      </div>
    </div>
  )
}