import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { MockService } from '../../services/mockService'
import {
  DollarSign,
  ShoppingBag,
  Users,
  ArrowUpRight,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_layout/')({
  component: Dashboard,
})

function Dashboard() {
  const [stats, setStats] = useState({ income: 0, orders: 0, activeTables: 0 });

  useEffect(() => {
    const load = async () => {
      // Nota: Idealmente maneja errores aquí con un try/catch en el futuro
      const fin = await MockService.getFinancialData();
      const tables = await MockService.getTables();
      const busy = tables.filter(t => t.status !== 'libre').length;
      setStats({
        income: fin.totalIncome,
        orders: fin.todaySales.length,
        activeTables: busy
      });
    };
    load();
  }, []);

  // Configuración de los enlaces de gestión rápida
  const quickLinks = [
    { label: 'Reportes', path: '/reports' },
    { label: 'Usuarios', path: '/admin?tab=users' },     // Ruta de gestión de personal/RRHH
    { label: 'Inventario', path: '/admin?tab=inventory' },   // Ruta de gestión de inventario en el panel admin
    { label: 'Ajustes', path: '/settings' }
  ];

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 min-h-screen bg-background">

      {/* HEADER*/}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard General</h1>
          <p className="text-slate-600 dark:text-slate-300 mt-2 text-lg">Bienvenido de nuevo. </p>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Card 1: Ingresos */}
        <Card className="border-orange-100 bg-white/80 dark:bg-card dark:text-white backdrop-blur shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign size={80} className="text-primary" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground dark:text-white">
              Ingresos Totales
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold mt-2">${stats.income.toLocaleString()}</div>
            <p className="text-xs text-primary font-medium mt-1 flex items-center">
              <ArrowUpRight size={14} className="mr-1" /> +12% vs ayer
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Pedidos */}
        <Card className="border-orange-100 bg-white/80 dark:bg-card dark:text-white backdrop-blur shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShoppingBag size={80} />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground dark:text-white">
              Pedidos Hoy
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag size={18} />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold mt-2">{stats.orders}</div>
            <p className="text-xs text-muted-foreground dark:text-white mt-1">
              Promedio de 15 mins/mesa
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Mesas */}
        <Card className="border-orange-100 bg-white/80 dark:bg-card dark:text-white backdrop-blur shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users size={80} className="text-orange-500" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground dark:text-white">
              Ocupación
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Users size={18} />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold mt-2">{stats.activeTables} / 9</div>
            {stats.activeTables > 7 && (
              <p className="text-xs text-orange-600 font-bold mt-1 flex items-center bg-orange-50 w-fit px-2 py-0.5 rounded-full">
                <AlertCircle size={12} className="mr-1" /> Alta demanda
              </p>
            )}
            {stats.activeTables <= 7 && (
              <p className="text-xs text-muted-foreground dark:text-white mt-1">Capacidad saludable</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SECCIÓN VISUAL ADICIONAL - GESTIÓN RÁPIDA CON NAVEGACIÓN */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Gestión Rápida</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map((item, i) => (
            <Link
              key={i}
              to={item.path}
              className="group p-4 bg-white dark:bg-slate-800 dark:text-white border border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-slate-700 transition-all flex items-center justify-between"
            >
              <span className="font-medium text-slate-900 dark:text-white">{item.label}</span>
              <div className="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <ArrowUpRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}