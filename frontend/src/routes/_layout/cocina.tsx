import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react';
import { MockService } from '../../services/mockService';
import { Order } from '../../types';
import { useToast } from '../../components/ui/Toast';
import { Clock, CheckCircle2, ChefHat } from 'lucide-react';

export const Route = createFileRoute('/_layout/cocina')({
  component: Cocina,
})

function Cocina() {
  const [orders, setOrders] = useState<Order[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const interval = setInterval(loadOrders, 5000);
    loadOrders();
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    const all = await MockService.getOrders();
    // Solo mostramos pendientes
    setOrders(all.filter(o => o.status === 'pendiente'));
  };

  const handleMarkReady = async (id: string) => {
    await MockService.markOrderReady(id);
    loadOrders();
    toast("¡Oído cocina! Plato listo. 🔔", "success");
  };

  // Cronómetro individual por tarjeta
  const Timer = ({ start }: { start: number }) => {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const i = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 60000)), 1000);
        return () => clearInterval(i);
    }, [start]);
    
    return (
        <span className={`flex items-center gap-1 font-bold ${elapsed > 15 ? 'text-red-600 animate-pulse' : 'text-slate-500'}`}>
            <Clock size={16}/> {elapsed} min
        </span>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-slate-200">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-orange-500 p-3 rounded-xl text-white shadow-lg">
            <ChefHat size={32} />
        </div>
        <div>
            <h1 className="text-3xl font-black text-slate-800">KDS - COCINA</h1>
            <p className="text-slate-500 font-medium">Pedidos pendientes en tiempo real</p>
        </div>
      </div>
      
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 text-gray-400">
            <CheckCircle2 size={80} className="mb-4 opacity-20"/>
            <p className="text-xl font-medium">Todo despachado, Chef.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {orders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col border-t-8 border-orange-500 animate-in slide-in-from-bottom-4">
                    {/* Header Tarjeta */}
                    <div className="p-4 bg-orange-50 border-b border-orange-100 flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-black text-slate-800">Mesa {order.tableId.replace('t-', '')}</h2>
                            <p className="text-xs font-mono text-slate-400 mt-1">ID: {order.id.slice(0,6)}</p>
                        </div>
                        <div className="bg-white px-3 py-1 rounded-full shadow-sm">
                            <Timer start={order.timestamp} />
                        </div>
                    </div>

                    {/* Lista Items */}
                    <div className="p-5 flex-1 space-y-4">
                        {order.items.map((item, i) => (
                            <div key={i} className="flex gap-4 items-start border-b border-dashed border-gray-100 pb-3 last:border-0 last:pb-0">
                                <span className="bg-slate-900 text-white w-10 h-10 flex items-center justify-center rounded-lg font-bold text-xl shrink-0">
                                    {item.quantity}
                                </span>
                                <div>
                                    <p className="text-xl font-bold leading-tight text-slate-700">{item.productName}</p>
                                    {item.notes && (
                                        <p className="bg-yellow-100 text-yellow-800 text-sm px-2 py-1 rounded mt-2 font-bold inline-block border border-yellow-200">
                                            ⚠️ {item.notes}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Botón Acción */}
                    <button 
                        onClick={() => handleMarkReady(order.id)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-5 text-xl tracking-wide uppercase transition-colors"
                    >
                        MARCAR LISTO
                    </button>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}