import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, Download, 
  CalendarRange, PieChart, Users, Receipt 
} from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler 
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import { MockService } from '../../services/mockService';
import { SaleRecord } from '../../types';
import { useToast } from '../../components/ui/Toast';

// Registro de componentes Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export const Route = createFileRoute('/_layout/reports')({
  component: Reports,
})

function Reports() {
  const [kpiData, setKpiData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'sales' | 'staff' | 'products'>('sales');
  const { toast } = useToast();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    const data = await MockService.getSalesReport();
    setKpiData(data.summary);
  };

  const downloadExcel = async () => {
    const data = await MockService.getSalesReport();
    const worksheet = XLSX.utils.json_to_sheet(data.history.map(s => ({
      Fecha: new Date(s.timestamp).toLocaleDateString(),
      Hora: new Date(s.timestamp).toLocaleTimeString(),
      Mesa: s.tableNumber,
      Mesero: s.waiterName,
      MetodoPago: s.method,
      Total: s.total,
      Costo: s.cost,
      Utilidad: s.total - s.cost - s.discount
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");
    XLSX.writeFile(workbook, "Reporte_Ventas_GastroPro.xlsx");
    toast("Reporte Excel generado", "success");
  };

  // Gráfico Simulado
  const getChartData = () => {
    const labels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    const dataPoints = labels.map(() => Math.floor(Math.random() * 400000) + 150000);
    return {
      labels,
      datasets: [{
          label: 'Ventas Semanales',
          data: dataPoints,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4
      }]
    };
  };

  if (!kpiData) return <div className="p-10 text-center">Cargando datos financieros...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2"><BarChart3/> Reportes</h1>
            <p className="text-slate-500">Inteligencia de Negocios</p>
        </div>
        <button onClick={downloadExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg">
            <Download size={18}/> Descargar Excel
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Ventas Hoy" value={`$${kpiData.totalRevenue.toLocaleString()}`} icon={TrendingUp} color="text-green-600" bg="bg-green-50"/>
        <KpiCard title="Costos (CMV)" value={`$${kpiData.totalCost.toLocaleString()}`} icon={DollarSign} color="text-red-600" bg="bg-red-50"/>
        <KpiCard title="Utilidad Neta" value={`$${kpiData.netProfit.toLocaleString()}`} icon={Receipt} color="text-blue-600" bg="bg-blue-50"/>
        <KpiCard title="Margen" value={`${((kpiData.netProfit/kpiData.totalRevenue)*100).toFixed(1)}%`} icon={CalendarRange} color="text-purple-600" bg="bg-purple-50"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border">
              <h3 className="font-bold text-lg mb-4">Tendencia de Ventas</h3>
              <div className="h-64">
                <Line data={getChartData()} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
              </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col justify-center items-center text-center">
              <PieChart size={64} className="text-slate-200 mb-4"/>
              <h3 className="text-xl font-bold text-slate-800">Productos Top</h3>
              <p className="text-slate-500 mb-4">Hamburguesa Doble es el plato más vendido hoy.</p>
              <div className="w-full bg-slate-100 rounded-full h-2 mb-1 overflow-hidden">
                  <div className="bg-orange-500 h-2 w-[80%]"></div>
              </div>
              <p className="text-xs text-slate-400 w-full text-left">80% Hamburguesas</p>
          </div>
      </div>

      {/* TABLA DETALLE */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="flex border-b">
              <button onClick={() => setActiveTab('sales')} className={`px-6 py-4 font-bold text-sm border-b-2 ${activeTab === 'sales' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>Ventas Hoy</button>
              <button onClick={() => setActiveTab('staff')} className={`px-6 py-4 font-bold text-sm border-b-2 ${activeTab === 'staff' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>Rendimiento</button>
          </div>
          <div className="p-0">
            {activeTab === 'sales' && (
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-bold border-b">
                        <tr><th className="p-4">Hora</th><th className="p-4">Mesa</th><th className="p-4">Mesero</th><th className="p-4 text-right">Total</th></tr>
                    </thead>
                    <tbody>
                        {kpiData.todaySales.map((s: any) => (
                            <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="p-4">{new Date(s.timestamp).toLocaleTimeString()}</td>
                                <td className="p-4 font-bold">#{s.tableNumber}</td>
                                <td className="p-4">{s.waiterName}</td>
                                <td className="p-4 text-right font-mono">${s.total.toLocaleString()}</td>
                            </tr>
                        ))}
                        {kpiData.todaySales.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400">Sin movimientos</td></tr>}
                    </tbody>
                </table>
            )}
             {activeTab === 'staff' && <div className="p-10 text-center text-gray-400">Datos de rendimiento disponibles al cierre.</div>}
          </div>
      </div>
    </div>
  );
}

const KpiCard = ({ title, value, icon: Icon, color, bg }: any) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border flex items-center gap-4">
    <div className={`p-3 rounded-xl ${bg} ${color}`}><Icon size={24} /></div>
    <div><p className="text-slate-500 text-sm font-bold">{title}</p><p className="text-2xl font-black text-slate-800">{value}</p></div>
  </div>
);