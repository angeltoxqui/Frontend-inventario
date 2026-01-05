import { createFileRoute } from '@tanstack/react-router'
import React, { useEffect, useState } from 'react'
import { MockService } from '../../services/mockService'
import { DollarSign, ShoppingBag, Users, Utensils, TrendingUp, Activity } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const [stats, setStats] = useState({ income: 0, orders: 0, activeTables: 0 });

  useEffect(() => {
    const load = async () => {
      const fin = await MockService.getFinancialData();
      const tables = await MockService.getTables();
      // Contamos mesas ocupadas (no libres)
      const busy = tables.filter(t => t.status !== 'libre').length;
      setStats({
        income: fin.totalIncome,
        orders: fin.todaySales.length,
        activeTables: busy
      });
    };
    load();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900">Hola, Admin </h1>
        <p className="text-slate-500">Aquí tienes el resumen de operación de hoy.</p>
      </div>

      {/* TARJETAS DE RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-4 bg-green-50 text-green-600 rounded-xl"><DollarSign size={24} /></div>
            <div>
                <p className="text-sm font-bold text-slate-400">Ventas Hoy</p>
                <p className="text-3xl font-black text-slate-800">${stats.income.toLocaleString()}</p>
            </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><ShoppingBag size={24} /></div>
            <div>
                <p className="text-sm font-bold text-slate-400">Pedidos Hoy</p>
                <p className="text-3xl font-black text-slate-800">{stats.orders}</p>
            </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-4 bg-orange-50 text-orange-600 rounded-xl"><Users size={24} /></div>
            <div>
                <p className="text-sm font-bold text-slate-400">Mesas Activas</p>
                <p className="text-3xl font-black text-slate-800">{stats.activeTables} / 9</p>
            </div>
        </div>
      </div>

      {/* ACCESOS RÁPIDOS */}
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity size={20}/> Accesos Rápidos</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/reports" className="p-4 bg-white border hover:border-slate-300 rounded-xl text-center hover:shadow-md transition-all group">
             <TrendingUp className="mx-auto mb-2 text-purple-500 group-hover:scale-110 transition-transform"/>
             <span className="font-bold text-slate-700">Ver Reportes</span>
          </Link>
          <Link to="/cocina" className="p-4 bg-white border hover:border-slate-300 rounded-xl text-center hover:shadow-md transition-all group">
             <Utensils className="mx-auto mb-2 text-orange-500 group-hover:scale-110 transition-transform"/>
             <span className="font-bold text-slate-700">Ir a Cocina</span>
          </Link>
      </div>
    </div>
  )
}