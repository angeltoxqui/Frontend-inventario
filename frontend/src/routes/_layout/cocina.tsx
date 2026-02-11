import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient'; // [NEW] Import Supabase
import { Order } from '../../types/legacy';
import { Button } from '../../components/ui/button';
import { useToast } from '../../components/ui/Toast';
import { Loader2, ChefHat, Clock, CheckCircle2, AlertCircle, UtensilsCrossed } from 'lucide-react';

export const Route = createFileRoute('/_layout/cocina')({
    component: Cocina,
})

function Cocina() {
    // queryClient available if needed for cache invalidation
    const { toast } = useToast();



    // [MODIFIED] Fetch active orders from Supabase
    const { data: orders = [], isLoading, refetch } = useQuery({
        queryKey: ['orders'],
        queryFn: async () => {
            // Fetch orders that are NOT in final states
            const { data, error } = await supabase
                .from('orders')
                .select(`
                id,
                status,
                created_at,
                table_id,
                items:order_items (
                    id, 
                    quantity,
                    notes,
                    product:products (name) 
                )
            `)
                .not('status', 'in', '("pagado","cancelado","entregado")') // Adjust filter based on needs
                .order('created_at', { ascending: true }); // Oldest first

            if (error) {
                console.error("Error fetching orders:", error);
                throw error;
            }

            // Map Supabase response to frontend Order type
            return data.map((o: any) => ({
                id: o.id,
                tableId: `t-${o.table_id}`, // Format for frontend if needed
                status: o.status === 'pending' ? 'pendiente' : (o.status === 'preparing' ? 'cocinando' : (o.status === 'ready' ? 'servir' : o.status)),
                timestamp: new Date(o.created_at).getTime(),
                items: o.items.map((i: any) => ({
                    productName: i.product?.name || 'Desconocido',
                    quantity: i.quantity,
                    notes: i.notes || ''
                }))
            }));
        },
        // We will use Subscription for updates, but keep interval as backup or remove it
        // refetchInterval: 3000, 
    });

    // [NEW] Real-time Subscription
    useEffect(() => {
        const channel = supabase
            .channel('kitchen-orders')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                () => {
                    toast("¡Actualización de Comandas!", "info");
                    refetch(); // Reload data on any change
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [refetch]);

    const activeOrders = orders; // We already filtered in the query

    // --- ACCIONES CON LOGICA Y FEEDBACK ---
    const handleStartCooking = async (orderId: string) => {
        // status: 'pendiente' -> 'preparing'
        const { error } = await supabase
            .from('orders')
            .update({ status: 'preparing' })
            .eq('id', orderId);

        if (error) {
            toast("Error al actualizar estado", "error");
        } else {
            toast("¡A cocinar! Orden en marcha.", "success");
            refetch();
        }
    };

    const handleMarkReadyToServe = async (orderId: string) => {
        // status: 'preparing' -> 'ready' (or 'servir')
        const { error } = await supabase
            .from('orders')
            .update({ status: 'ready' }) // Assuming 'ready' maps to 'servir'
            .eq('id', orderId);

        if (error) {
            toast("Error al actualizar estado", "error");
        } else {
            toast("Orden lista para servir.", "success");
            refetch();
        }
    };

    const formatTableId = (id: string) => id.replace(/^t-/, '');

    // [CORRECCIÓN] Estilos visuales adaptados a Dark Mode con opacidad
    const getOrderStyles = (status: Order['status']) => {
        switch (status) {
            case 'pendiente':
                return {
                    card: 'bg-yellow-500/10 border-t-8 border-yellow-500 shadow-sm hover:shadow-md',
                    headerBg: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
                    icon: <Clock className="text-yellow-600 dark:text-yellow-400" size={20} />,
                    statusText: 'Nuevo Pedido'
                };
            case 'cocinando':
                return {
                    card: 'bg-orange-500/10 border-t-8 border-orange-500 shadow-md ring-1 ring-orange-500/20',
                    headerBg: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
                    icon: <ChefHat className="text-orange-600 dark:text-orange-400 animate-pulse" size={20} />,
                    statusText: 'En Preparación'
                };
            case 'servir':
                return {
                    card: 'bg-emerald-500/10 border-t-8 border-emerald-500 shadow-md',
                    headerBg: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
                    icon: <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={20} />,
                    statusText: 'Listo para Servir'
                };
            default:
                return { card: 'bg-card', headerBg: 'bg-muted', icon: null, statusText: status };
        }
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" size={48} /></div>;

    return (
        // [CORRECCIÓN] Fondo bg-muted/40
        <div className="p-6 min-h-screen bg-muted/40 font-sans">
            <div className="flex items-center gap-3 mb-8">
                {/* [CORRECCIÓN] Icono bg-card */}
                <div className="p-3 bg-card rounded-xl shadow-sm border border-border">
                    <ChefHat size={32} className="text-foreground" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">Monitor de Cocina</h1>
                    <p className="text-muted-foreground font-medium">Pedidos activos: <span className="font-bold text-foreground">{activeOrders.length}</span></p>
                </div>
            </div>

            {activeOrders.length === 0 ? (
                // [CORRECCIÓN] Estado vacío bg-card
                <div className="flex flex-col items-center justify-center py-32 opacity-60 bg-card rounded-3xl border-4 border-dashed border-border mx-auto max-w-2xl">
                    <div className="bg-muted p-6 rounded-full mb-4">
                        <UtensilsCrossed size={64} className="text-muted-foreground" />
                    </div>
                    <h2 className="text-2xl font-bold text-muted-foreground">Sin comandas pendientes</h2>
                    <p className="text-muted-foreground">La cocina está al día.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                    {activeOrders.map(o => {
                        const styles = getOrderStyles(o.status);
                        const date = new Date(o.timestamp);
                        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        return (
                            <div key={o.id} className={`rounded-2xl overflow-hidden transition-all duration-300 flex flex-col shadow-sm border border-border/50 ${styles.card}`}>
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
                                {/* [CORRECCIÓN] Fondo del cuerpo bg-card */}
                                <div className="p-5 flex-1 flex flex-col bg-card">
                                    <div className="mb-6 flex items-baseline gap-2 border-b border-dashed border-border pb-4">
                                        <span className="text-foreground font-black text-2xl uppercase">Mesa</span>
                                        <span className="text-4xl font-black text-foreground leading-none tracking-tighter">
                                            {formatTableId(o.tableId)}
                                        </span>
                                    </div>

                                    <ul className="space-y-4 flex-1">
                                        {o.items.map((item: any, idx: number) => (
                                            <li key={idx} className="flex items-start gap-3">
                                                {/* [CORRECCIÓN] Cantidad con colores adaptados */}
                                                <div className="bg-foreground text-background font-black text-lg w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                                                    {item.quantity}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-foreground text-lg leading-tight break-words">
                                                        {item.productName}
                                                    </p>
                                                    {item.notes && (
                                                        // [CORRECCIÓN] Notas con opacidad
                                                        <div className="mt-2 flex items-start gap-1.5 text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1.5 rounded-lg text-sm font-bold">
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
                                {/* [CORRECCIÓN] Footer con bg-muted */}
                                <div className="p-4 bg-muted/30 border-t border-border mt-auto">
                                    {o.status === 'pendiente' && (
                                        <Button onClick={() => handleStartCooking(o.id)} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-7 h-auto text-lg shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] rounded-xl">
                                            <ChefHat className="mr-2" size={24} /> Empezar
                                        </Button>
                                    )}
                                    {o.status === 'cocinando' && (
                                        <Button onClick={() => handleMarkReadyToServe(o.id)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-7 h-auto text-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] rounded-xl animate-in zoom-in duration-300">
                                            <CheckCircle2 className="mr-2" size={24} /> ¡Terminar!
                                        </Button>
                                    )}
                                    {o.status === 'servir' && (
                                        <div className="text-center text-emerald-700 dark:text-emerald-400 font-bold py-3 flex items-center justify-center gap-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                            <CheckCircle2 size={20} /> Esperando retiro
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