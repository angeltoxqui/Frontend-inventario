import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, Calendar, 
  Download, ShoppingBag, CreditCard, PieChart, Users, Package,
  ArrowUpRight, ArrowDownRight, FileSpreadsheet, Layers, CheckCircle2, Award, BarChart4, FileText, Truck
} from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement, ArcElement 
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import { MockService } from '../../services/mockService';
import { SaleRecord, Ingredient, Expense } from '../../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement, ArcElement);

export const Route = createFileRoute('/_layout/reports')({
  component: Reports,
})

type TimeRange = 'day' | 'week' | 'biweek' | 'month';
type TabType = 'sales' | 'performance' | 'inventory' | 'purchases';

function Reports() {
  const [activeTab, setActiveTab] = useState<TabType>('sales');
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  
  const [history, setHistory] = useState<SaleRecord[]>([]);
  const [inventoryData, setInventoryData] = useState<{ingredients: Ingredient[], expenses: Expense[]}>({ingredients:[], expenses:[]});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
        try {
            const report = await MockService.getSalesReport();
            setHistory(report.history);
            const invData = await MockService.getInventoryData();
            setInventoryData({ ingredients: invData.ingredients, expenses: invData.expenses });
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    load();
  }, []);

  // --- 1. FILTRADO POR FECHA (Ventas y Gastos) ---
  const dateFilter = (timestamp: number) => {
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      const pastDate = new Date(now);
      
      if (timeRange === 'day') pastDate.setDate(now.getDate());
      if (timeRange === 'week') pastDate.setDate(now.getDate() - 7);
      if (timeRange === 'biweek') pastDate.setDate(now.getDate() - 15);
      if (timeRange === 'month') pastDate.setDate(now.getDate() - 30);
      
      if (timeRange === 'day') {
          const todayStr = new Date().toDateString();
          return new Date(timestamp).toDateString() === todayStr;
      }
      return timestamp >= pastDate.getTime();
  };

  const filteredSales = useMemo(() => history.filter(s => dateFilter(s.timestamp)), [history, timeRange]);
  const filteredExpenses = useMemo(() => inventoryData.expenses.filter(e => dateFilter(e.timestamp)), [inventoryData.expenses, timeRange]);

  // --- 2. CÁLCULOS GENERALES ---
  const totalSales = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalTransactions = filteredSales.length;
  const totalExpensesPeriod = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  // --- 3. RENDIMIENTO ---
  const productPerformance = useMemo(() => {
      const counts: Record<string, { qty: number, totalRevenue: number }> = {};
      filteredSales.forEach(sale => {
          sale.itemsSummary?.forEach(item => {
              const revenue = item.price * item.quantity;
              if (!counts[item.name]) counts[item.name] = { qty: 0, totalRevenue: 0 };
              counts[item.name].qty += item.quantity;
              counts[item.name].totalRevenue += revenue; 
          });
      });
      return Object.entries(counts).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.totalRevenue - a.totalRevenue); 
  }, [filteredSales]);

  const staffPerformance = useMemo(() => {
      const counts: Record<string, { orders: number, totalRevenue: number }> = {};
      filteredSales.forEach(sale => {
          const name = sale.waiterName || 'Desconocido';
          if (!counts[name]) counts[name] = { orders: 0, totalRevenue: 0 };
          counts[name].orders += 1;
          counts[name].totalRevenue += sale.total;
      });
      return Object.entries(counts).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredSales]);

  // --- 4. INVENTARIO (VALORIZACIÓN) ---
  const totalInventoryValue = inventoryData.ingredients.reduce((acc, i) => acc + (i.cost * i.currentStock), 0);
  const inventoryBreakdown = [...inventoryData.ingredients].sort((a, b) => (b.cost * b.currentStock) - (a.cost * a.currentStock));

  // --- 5. EXPORTACIÓN EXCEL ---
  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();
    const dateLabel = getRangeLabel(timeRange);

    if (activeTab === 'sales') {
        const ws = XLSX.utils.json_to_sheet(filteredSales.map(s => ({
            ID: s.id.slice(0,6), Fecha: new Date(s.timestamp).toLocaleDateString(), Hora: new Date(s.timestamp).toLocaleTimeString(),
            Total: s.total, Metodo: s.method, Mesero: s.waiterName,
            Detalle_Items: s.itemsSummary?.map(i => `${i.quantity}x ${i.name}`).join(', ')
        })));
        XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    } 
    else if (activeTab === 'performance') {
        const ws_prod = XLSX.utils.json_to_sheet(productPerformance.map(p => ({ Producto: p.name, Unidades: p.qty, Venta_Total: p.totalRevenue })));
        XLSX.utils.book_append_sheet(wb, ws_prod, "Rendimiento_Productos");
        const ws_staff = XLSX.utils.json_to_sheet(staffPerformance.map(s => ({ Colaborador: s.name, Pedidos: s.orders, Venta_Total: s.totalRevenue })));
        XLSX.utils.book_append_sheet(wb, ws_staff, "Rendimiento_Personal");
    }
    else if (activeTab === 'inventory') {
        const ws_inv = XLSX.utils.json_to_sheet(inventoryBreakdown.map(i => ({
            Insumo: i.name, Costo_Unit: i.cost, Stock: i.currentStock, Total: i.cost * i.currentStock,
            Ultima_Actualizacion: i.lastUpdated ? new Date(i.lastUpdated).toLocaleDateString() : 'N/A'
        })));
        XLSX.utils.book_append_sheet(wb, ws_inv, "Valorizacion_Bodega");
    }
    else if (activeTab === 'purchases') {
        const ws_exp = XLSX.utils.json_to_sheet(filteredExpenses.map(e => ({
            Fecha: new Date(e.timestamp).toLocaleDateString(), Concepto: e.concept, Categoria: e.category, Monto: e.amount, Responsable: e.registeredBy
        })));
        XLSX.utils.book_append_sheet(wb, ws_exp, `Compras_${dateLabel}`);
    }
    
    XLSX.writeFile(wb, `Reporte_${activeTab}_${dateLabel}.xlsx`);
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-400">Cargando...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-black text-slate-900">Reportes Gerenciales</h1>
            <p className="text-slate-500">Datos precisos para decisiones inteligentes</p>
        </div>
        <div className="flex gap-4">
            <div className="flex bg-white p-1 rounded-xl border shadow-sm overflow-x-auto">
                <TabButton active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} label="Ventas" icon={DollarSign}/>
                <TabButton active={activeTab === 'performance'} onClick={() => setActiveTab('performance')} label="Rendimiento" icon={BarChart4}/>
                <TabButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} label="Inventario" icon={Package}/>
                <TabButton active={activeTab === 'purchases'} onClick={() => setActiveTab('purchases')} label="Compras" icon={Truck}/>
            </div>
            <button onClick={downloadExcel} className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 shadow-md whitespace-nowrap">
                <FileSpreadsheet size={18}/> Excel
            </button>
        </div>
      </div>

      {/* FILTRO DE TIEMPO (Solo para Ventas, Rendimiento y Compras) */}
      {activeTab !== 'inventory' && (
          <div className="mb-6 flex items-center gap-2 bg-white p-2 rounded-lg w-fit shadow-sm border">
              <span className="text-xs font-bold text-slate-400 uppercase px-2">Rango:</span>
              <TimeFilterBtn active={timeRange==='day'} onClick={()=>setTimeRange('day')} label="Hoy"/>
              <TimeFilterBtn active={timeRange==='week'} onClick={()=>setTimeRange('week')} label="7 Días"/>
              <TimeFilterBtn active={timeRange==='biweek'} onClick={()=>setTimeRange('biweek')} label="15 Días"/>
              <TimeFilterBtn active={timeRange==='month'} onClick={()=>setTimeRange('month')} label="30 Días"/>
          </div>
      )}

      {/* --- PESTAÑA 1: VENTAS --- */}
      {activeTab === 'sales' && (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <BigKpiCard title={`Ventas (${getRangeLabel(timeRange)})`} value={totalSales} color="text-green-600" bg="bg-green-50" icon={TrendingUp} sub={`${totalTransactions} facturas`}/>
                <BigKpiCard title="Producto Estrella" value={productPerformance[0]?.totalRevenue || 0} label={productPerformance[0]?.name || "Sin datos"} color="text-purple-600" bg="bg-purple-50" icon={ArrowUpRight} sub="Mayor ingreso" isCurrency={true}/>
                <BigKpiCard title="Ticket Promedio" value={totalTransactions ? Math.round(totalSales/totalTransactions) : 0} color="text-blue-600" bg="bg-blue-50" icon={CreditCard} sub="Por mesa"/>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border shadow-sm h-full">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Layers size={18}/> Desglose de Ventas</h3>
                    <div className="overflow-y-auto max-h-[400px]">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs font-bold text-slate-400 uppercase bg-slate-50 sticky top-0">
                                <tr><th className="p-3">Hora</th><th className="p-3">Detalle</th><th className="p-3 text-right">Total</th></tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredSales.length === 0 ? <tr><td colSpan={3} className="p-8 text-center text-gray-400 italic">No hay datos.</td></tr> : 
                                filteredSales.slice().reverse().map((s) => (
                                    <tr key={s.id} className="hover:bg-slate-50">
                                        <td className="p-3 font-mono text-slate-500">{new Date(s.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                        <td className="p-3"><div className="font-bold text-slate-700">Mesa {s.tableNumber}</div><div className="text-xs text-slate-500 truncate max-w-[200px]">{s.itemsSummary?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Varios'}</div></td>
                                        <td className="p-3 text-right font-bold text-green-600">${s.total.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><PieChart size={18}/> Métodos de Pago</h3>
                    <div className="flex-1 min-h-[300px]"><PaymentMethodsChart sales={filteredSales} /></div>
                </div>
            </div>
        </div>
      )}

      {/* --- PESTAÑA 2: RENDIMIENTO --- */}
      {activeTab === 'performance' && (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2"><ArrowUpRight className="text-green-600"/> Los Más Vendidos (Top 5)</h3>
                    <div className="space-y-4">
                        {productPerformance.slice(0, 5).map((p, i) => (
                            <div key={i} className="relative">
                                <div className="flex justify-between items-end mb-1 text-sm">
                                    <span className="font-bold text-slate-700 flex gap-2"><span className="text-slate-400 font-mono">#{i+1}</span> {p.name}</span>
                                    <span className="font-bold text-green-600">${p.totalRevenue.toLocaleString()} <span className="text-xs text-slate-400 font-normal">({p.qty} unids)</span></span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${(p.totalRevenue / (productPerformance[0]?.totalRevenue || 1)) * 100}%` }}></div></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2"><ArrowDownRight className="text-red-600"/> Los Menos Vendidos (Bottom 5)</h3>
                    <div className="space-y-4">
                        {productPerformance.slice(-5).reverse().map((p, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                                <span className="font-medium text-slate-700">{p.name}</span>
                                <div className="text-right"><p className="font-bold text-red-600">${p.totalRevenue.toLocaleString()}</p><p className="text-xs text-red-400">{p.qty} unidades</p></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2"><Users className="text-blue-600"/> Rendimiento del Equipo</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {staffPerformance.map((s, i) => (
                        <div key={i} className="p-4 rounded-xl border flex items-center gap-4 bg-slate-50">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${i===0 ? 'bg-yellow-500' : (i===1 ? 'bg-gray-400' : 'bg-orange-700')}`}>{i < 3 ? <Award size={20}/> : `#${i+1}`}</div>
                            <div><p className="font-bold text-slate-800">{s.name}</p><p className="text-sm text-slate-500">{s.orders} pedidos cerrados</p><p className="font-bold text-blue-600 mt-1">${s.totalRevenue.toLocaleString()}</p></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* --- PESTAÑA 3: INVENTARIO (VALORIZACIÓN) --- */}
      {activeTab === 'inventory' && (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl flex flex-col justify-center">
                    <p className="opacity-70 font-bold uppercase text-sm tracking-wider mb-2">Valorización Bodega (Actual)</p>
                    <h2 className="text-5xl font-black mb-4">${totalInventoryValue.toLocaleString()}</h2>
                    <p className="text-sm opacity-60">Capital total invertido en insumos disponibles hoy.</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col">
                    <h3 className="font-bold text-slate-700 mb-4 text-red-600 flex items-center gap-2"><ArrowDownRight/> Stock Bajo</h3>
                    <div className="flex-1 overflow-y-auto">
                        {inventoryData.ingredients.filter(i => i.currentStock < i.maxStock * 0.2).length === 0 ? (
                            <div className="h-full flex items-center justify-center text-green-600 font-medium"><CheckCircle2 size={24} className="mr-2"/> Todo OK.</div>
                        ) : (
                            <table className="w-full text-sm"><tbody>{inventoryData.ingredients.filter(i => i.currentStock < i.maxStock * 0.2).map(i => <tr key={i.id} className="border-b"><td className="py-2 font-bold">{i.name}</td><td className="py-2 text-right text-red-600 font-bold">{i.currentStock} {i.unit}</td></tr>)}</tbody></table>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h3 className="font-bold text-lg text-slate-800 mb-4">Desglose de Valorización</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                            <tr><th className="p-4">Insumo</th><th className="p-4 text-right">Costo Unit.</th><th className="p-4 text-right">Stock</th><th className="p-4 text-right">Total</th><th className="p-4 text-right">Última Act.</th></tr>
                        </thead>
                        <tbody className="divide-y">
                            {inventoryBreakdown.map(i => (
                                <tr key={i.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-bold text-slate-700">{i.name}</td>
                                    <td className="p-4 text-right text-slate-500">${i.cost.toLocaleString()}</td>
                                    <td className="p-4 text-right font-medium">{i.currentStock} {i.unit}</td>
                                    <td className="p-4 text-right font-mono font-bold text-slate-900">${(i.cost * i.currentStock).toLocaleString()}</td>
                                    <td className="p-4 text-right text-xs text-slate-400">{i.lastUpdated ? new Date(i.lastUpdated).toLocaleDateString() : 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* --- PESTAÑA 4: COMPRAS (HISTORIAL DE GASTOS) --- */}
      {activeTab === 'purchases' && (
        <div className="space-y-6 animate-in fade-in duration-300">
            <BigKpiCard 
                title={`Compras de Insumos (${getRangeLabel(timeRange)})`} 
                value={totalExpensesPeriod} 
                color="text-red-600" bg="bg-red-50" icon={ShoppingBag} 
                sub="Salidas de dinero registradas en el periodo"
            />

            <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <FileText size={20}/> Historial Detallado
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                            <tr><th className="p-4">Fecha</th><th className="p-4">Concepto</th><th className="p-4">Categoría</th><th className="p-4 text-right">Monto</th></tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredExpenses.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-gray-400">Sin compras en este periodo.</td></tr> : 
                            filteredExpenses.slice().reverse().map(e => (
                                <tr key={e.id} className="hover:bg-slate-50">
                                    <td className="p-4 text-gray-500">{new Date(e.timestamp).toLocaleDateString()} {new Date(e.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                    <td className="p-4 font-medium text-slate-700">{e.concept}</td>
                                    <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs uppercase">{e.category}</span></td>
                                    <td className="p-4 text-right font-bold text-red-600">-${e.amount.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

const getRangeLabel = (range: TimeRange) => { switch(range) { case 'day': return 'Hoy'; case 'week': return '7 Días'; case 'biweek': return '15 Días'; case 'month': return 'Mes'; } }
const TabButton = ({ active, onClick, label, icon: Icon }: any) => (<button onClick={onClick} className={`px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${active ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}><Icon size={16} /> {label}</button>);
const TimeFilterBtn = ({ active, onClick, label }: any) => (<button onClick={onClick} className={`px-3 py-1 text-xs font-bold rounded transition-all ${active ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{label}</button>);
const BigKpiCard = ({ title, value, label, sub, color, bg, icon: Icon, isCurrency = true }: any) => (<div className={`p-6 rounded-2xl border shadow-sm ${bg} border-opacity-50`}><div className="flex justify-between items-start mb-2"><p className="text-slate-600 font-bold text-xs uppercase tracking-wide">{title}</p><div className={`p-2 rounded-lg bg-white bg-opacity-60 ${color}`}><Icon size={20}/></div></div><div className="flex items-baseline gap-2"><h2 className={`text-3xl font-black ${color}`}>{label ? label : (isCurrency ? `$${value.toLocaleString()}` : value)}</h2>{label && <span className="text-sm font-bold text-slate-500">${value.toLocaleString()}</span>}</div><p className="text-xs text-slate-500 mt-2 font-medium">{sub}</p></div>);
const PaymentMethodsChart = ({ sales }: { sales: SaleRecord[] }) => {
    const data = useMemo(() => {
        const methods = sales.reduce((acc: any, curr) => { const key = curr.method || 'OTROS'; acc[key] = (acc[key] || 0) + curr.total; return acc; }, {});
        return { labels: Object.keys(methods).map(k => k.toUpperCase()), datasets: [{ data: Object.values(methods), backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#6366f1'], borderWidth: 0 }] };
    }, [sales]);
    if (sales.length === 0) return <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin datos.</div>;
    return <Doughnut data={data} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />;
}