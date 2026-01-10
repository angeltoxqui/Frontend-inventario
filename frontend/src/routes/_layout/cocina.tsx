import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MockService } from '../../services/mockService';
import { Order } from '../../types';
import { Button } from '../../components/ui/button';
import { useToast } from '../../components/ui/Toast';
import { Loader2, ChefHat, Clock, CheckCircle2, AlertCircle, UtensilsCrossed } from 'lucide-react';

export const Route = createFileRoute('/_layout/cocina')({
  component: Cocina,
})

function Cocina() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: MockService.getOrders,
    refetchInterval: 3000,
  });

  // --- FILTRO CORRECTO ---
  // Excluimos:
  // - 'pagando', 'pagado', 'finalizado', 'cancelado': No son para cocina.
  // - 'entregado': El mesero ya lo sirvió, así que desaparece del monitor.
  const activeOrders = orders.filter(o => 
    !['pagando', 'pagado', 'finalizado', 'cancelado', 'entregado'].includes(o.status)
  );

  // --- ACCIONES CON LOGICA Y FEEDBACK ---
  const handleStartCooking = async (orderId: string) => {
      // 1. Feedback visual inmediato
      toast("¡A cocinar! Orden en marcha.", "success");
      
      // 2. Llamada al servicio (esto actualizará la DB y cambiará el estado de la mesa)
      await MockService.updateOrderStatus(orderId, 'cocinando');
      
      // 3. Refrescar datos
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['tables'] });
  };

  const handleMarkReadyToServe = async (orderId: string) => {
      toast("Orden lista para servir.", "success");
      await MockService.updateOrderStatus(orderId, 'servir');
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['tables'] });
  };

  // Helper para quitar el "t-" del ID (t-1 -> 1)
  const formatTableId = (id: string) => id.replace(/^t-/, '');

  // Estilos visuales según estado (MODIFICADO: Borde superior en lugar de lateral)
  const getOrderStyles = (status: Order['status']) => {
    switch (status) {
        case 'pendiente':
            return {
                // CAMBIO: border-t-8 en vez de border-l-8
                card: 'bg-yellow-50 border-t-8 border-yellow-400 shadow-sm hover:shadow-md',
                headerBg: 'bg-yellow-100/60 text-yellow-800',
                icon: <Clock className="text-yellow-600" size={20} />,
                statusText: 'Nuevo Pedido'
            };
        case 'cocinando':
            return {
                // CAMBIO: border-t-8 en vez de border-l-8
                card: 'bg-orange-50 border-t-8 border-orange-600 shadow-md ring-1 ring-orange-200/50',
                headerBg: 'bg-orange-100 text-orange-900',
                icon: <ChefHat className="text-orange-700 animate-pulse" size={20} />,
                statusText: 'En Preparación'
            };
        case 'servir':
            return {
                // CAMBIO: border-t-8 en vez de border-l-8
                card: 'bg-emerald-50 border-t-8 border-emerald-500 shadow-md',
                headerBg: 'bg-emerald-100 text-emerald-900',
                icon: <CheckCircle2 className="text-emerald-600" size={20} />,
                statusText: 'Listo para Servir'
            };
        default:
            return { card: 'bg-white', headerBg: 'bg-gray-50', icon: null, statusText: status };
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={48} /></div>;

  return (
    <div className="p-6 min-h-screen bg-slate-100 font-sans">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-white rounded-xl shadow-sm">
            <ChefHat size={32} className="text-slate-800"/>
        </div>
        <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Monitor de Cocina</h1>
            <p className="text-slate-500 font-medium">Pedidos activos: <span className="font-bold text-slate-900">{activeOrders.length}</span></p>
        </div>
      </div>

      {activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-60 bg-white rounded-3xl border-4 border-dashed border-slate-200 mx-auto max-w-2xl">
              <div className="bg-slate-50 p-6 rounded-full mb-4">
                <UtensilsCrossed size={64} className="text-slate-300"/>
              </div>
              <h2 className="text-2xl font-bold text-slate-400">Sin comandas pendientes</h2>
              <p className="text-slate-400">La cocina está al día.</p>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {activeOrders.map(o => {
            const styles = getOrderStyles(o.status);
            const date = new Date(o.timestamp);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={o.id} className={`rounded-2xl overflow-hidden transition-all duration-300 flex flex-col ${styles.card}`}>
                {/* Encabezado */}
                <div className={`p-4 flex justify-between items-center border-b border-black/5 ${styles.headerBg}`}>
                    <div className="flex items-center gap-2">
                        {styles.icon}
                        <span className="font-black uppercase text-xs tracking-wider">{styles.statusText}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-sm font-bold opacity-90 block">{timeStr}</span>
                        <span className="text-[10px] font-mono opacity-60">#{o.id}</span>
                    </div>
                </div>

                {/* Cuerpo */}
                <div className="p-5 flex-1 flex flex-col">
                    {/* Visualización de MESA corregida */}
                    <div className="mb-6 flex items-baseline gap-2 border-b border-dashed border-slate-200 pb-4">
                        <span className="text-slate-800 font-black text-2xl uppercase">Mesa</span>
                        <span className="text-4xl font-black text-slate-800 leading-none tracking-tighter">
                            {formatTableId(o.tableId)}
                        </span>
                    </div>
                  
                    <ul className="space-y-4 flex-1">
                        {o.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                            <div className="bg-slate-800 text-white font-black text-lg w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                                {item.quantity}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-700 text-lg leading-tight break-words">
                                    {item.productName}
                                </p>
                                {item.notes && (
                                    <div className="mt-2 flex items-start gap-1.5 text-red-700 bg-red-50 border border-red-100 px-2 py-1.5 rounded-lg text-sm font-bold">
                                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                        <span className="italic leading-snug break-words">"{item.notes}"</span>
                                    </div>
                                )}
                            </div>
                        </li>
                        ))}
                    </ul>
                </div>
                
                {/* Botones de Acción */}
                <div className="p-4 bg-white/50 border-t border-slate-100/50 mt-auto">
                    {o.status === 'pendiente' && (
                        <Button onClick={() => handleStartCooking(o.id)} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-7 h-auto text-lg shadow-lg shadow-orange-200 transition-all active:scale-[0.98] rounded-xl">
                           <ChefHat className="mr-2" size={24}/> Empezar
                        </Button>
                    )}
                    {o.status === 'cocinando' && (
                        <Button onClick={() => handleMarkReadyToServe(o.id)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-7 h-auto text-lg shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] rounded-xl animate-in zoom-in duration-300">
                           <CheckCircle2 className="mr-2" size={24}/> ¡Terminar!
                        </Button>
                    )}
                    {o.status === 'servir' && (
                         <div className="text-center text-emerald-700 font-bold py-3 flex items-center justify-center gap-2 bg-emerald-100/50 rounded-xl border border-emerald-100">
                            <CheckCircle2 size={20}/> Esperando retiro
                         </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Cocina;