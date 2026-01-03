import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/ui/Toast';
import { MockService } from '../../services/mockService';
import { Order, OrderItem } from '../../types';
import { Wallet, Receipt, CreditCard, Smartphone, Banknote, Printer, Calculator, User, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';

export const Route = createFileRoute('/_layout/caja')({
  component: Caja,
})

function Caja() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const { toast } = useToast();
  
  // Estado Modal Pago
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [itemsToPay, setItemsToPay] = useState<OrderItem[]>([]); // Items específicos a pagar ahora
  const [payerName, setPayerName] = useState<string>(''); // Nombre de quien paga (si es split)
  
  const [paymentMethod, setPaymentMethod] = useState<'efectivo'|'tarjeta'|'nequi'>('efectivo');
  const [isFactura, setIsFactura] = useState(false);
  const [clientData, setClientData] = useState({ nit: '', name: '', email: '', phone: '' });
  const [discount, setDiscount] = useState(0);
  const [tip, setTip] = useState(0);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Estado Arqueo
  const [isArqueoOpen, setIsArqueoOpen] = useState(false);
  const [arqueoAmount, setArqueoAmount] = useState('');

  useEffect(() => {
    loadData();
    const i = setInterval(loadData, 5000);
    return () => clearInterval(i);
  }, []);

  const loadData = async () => {
    const orders = await MockService.getOrders();
    // El cajero ve ordenes 'por_cobrar' (solicitadas) o 'entregado' (ya comieron, pueden pagar directo)
    setPendingOrders(orders.filter(o => o.status === 'por_cobrar' || o.status === 'entregado'));
  };

  // Abrir modal de pago
  const openPayment = (order: Order, specificItems?: OrderItem[], name?: string) => {
    setSelectedOrder(order);
    setItemsToPay(specificItems || order.items); // Si no se especifican, son todos
    setPayerName(name || 'Cuenta Única');
    setPaymentMethod('efectivo');
    setDiscount(0);
    setTip(0);
    setIsFactura(false);
    setIsPaymentOpen(true);
  };

  const calculateTotal = () => {
    const subtotal = itemsToPay.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const totalDiscount = subtotal * (discount / 100);
    return subtotal - totalDiscount + (tip || 0);
  };

  const handlePay = async () => {
    if (selectedOrder) {
      if (isFactura && (!clientData.nit || !clientData.name)) {
        toast("Faltan datos de facturación electrónica", "error");
        return;
      }
      
      await MockService.payOrder(selectedOrder.id, calculateTotal(), itemsToPay, paymentMethod);
      setIsPaymentOpen(false);
      loadData();
      toast("Pago registrado exitosamente 💰", "success");
    }
  };

  // Agrupar items por nombre (para vista de cuenta dividida)
  const groupItemsByName = (items: OrderItem[]) => {
    const groups: Record<string, OrderItem[]> = {};
    items.forEach(item => {
        const name = item.assignedTo || 'Sin Asignar';
        if (!groups[name]) groups[name] = [];
        groups[name].push(item);
    });
    return groups;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Wallet className="text-slate-900"/> Terminal de Caja
            </h1>
            <p className="text-slate-500">Gestión de cobros y cierres</p>
        </div>
        <Button onClick={() => setIsArqueoOpen(true)} className="bg-slate-900 text-white gap-2 h-12 px-6 text-lg">
            <Calculator size={20}/> Cierre de Caja
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pendingOrders.map(order => (
            <div key={order.id} className="bg-white border p-0 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="bg-purple-50 p-4 border-b border-purple-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Mesa {order.tableId.replace('t-', '')}</h2>
                        {order.isSplit ? (
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-bold flex items-center gap-1 w-fit mt-1">
                                <User size={12}/> CUENTA DIVIDIDA
                            </span>
                        ) : (
                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-bold mt-1 inline-block">Cuenta Única</span>
                        )}
                    </div>
                    <span className="text-xs font-mono text-slate-400">ID: {order.id.slice(0,4)}</span>
                </div>

                <div className="p-4 flex-1">
                    {/* VISTA CUENTA DIVIDIDA */}
                    {order.isSplit ? (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-500 font-medium">Sub-cuentas pendientes:</p>
                            {Object.entries(groupItemsByName(order.items)).map(([name, items]) => {
                                const subtotal = items.reduce((a, b) => a + b.price, 0);
                                return (
                                    <div key={name} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <div>
                                            <div className="flex items-center gap-2 font-bold text-slate-700">
                                                <User size={16} className="text-blue-500"/> {name}
                                            </div>
                                            <p className="text-xs text-gray-500">{items.length} items • ${subtotal.toLocaleString()}</p>
                                        </div>
                                        <Button size="sm" onClick={() => openPayment(order, items, name)} className="bg-white border hover:bg-green-50 text-green-700 hover:text-green-800 border-green-200">
                                            Cobrar
                                        </Button>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        /* VISTA CUENTA ÚNICA */
                        <div className="text-center py-4">
                            <p className="text-gray-500 mb-2">Total a Pagar</p>
                            <p className="text-4xl font-black text-slate-900 mb-4">
                                ${order.items.reduce((a, b) => a + b.price, 0).toLocaleString()}
                            </p>
                            <Button onClick={() => openPayment(order)} className="w-full bg-slate-900 hover:bg-slate-800 h-14 text-lg">
                                Cobrar Todo
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        ))}
        {pendingOrders.length === 0 && (
            <div className="col-span-3 text-center py-20 bg-white rounded-xl border border-dashed">
                <p className="text-gray-400 text-xl">No hay cobros pendientes</p>
            </div>
        )}
      </div>

      {/* MODAL DE PAGO */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Receipt className="text-slate-900"/> Procesar Pago: <span className="text-slate-500">{payerName}</span>
                </DialogTitle>
            </DialogHeader>
            
            <div className="py-4 space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl text-center border">
                    <p className="text-sm text-gray-500 uppercase font-bold tracking-wide">Monto Final</p>
                    <p className="text-5xl font-black text-slate-900 tracking-tight">${calculateTotal().toLocaleString()}</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <Button variant={paymentMethod === 'efectivo' ? 'default' : 'outline'} onClick={() => setPaymentMethod('efectivo')} className={`flex flex-col h-24 gap-2 ${paymentMethod === 'efectivo' ? 'bg-green-600 hover:bg-green-700' : ''}`}>
                        <Banknote size={28}/> Efectivo
                    </Button>
                    <Button variant={paymentMethod === 'tarjeta' ? 'default' : 'outline'} onClick={() => setPaymentMethod('tarjeta')} className={`flex flex-col h-24 gap-2 ${paymentMethod === 'tarjeta' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}>
                        <CreditCard size={28}/> Tarjeta
                    </Button>
                    <Button variant={paymentMethod === 'nequi' ? 'default' : 'outline'} onClick={() => setPaymentMethod('nequi')} className={`flex flex-col h-24 gap-2 ${paymentMethod === 'nequi' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}>
                        <Smartphone size={28}/> Nequi
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label>Descuento (%)</Label>
                        <Input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="text-center font-bold"/>
                    </div>
                    <div className="space-y-1">
                        <Label>Propina Voluntaria ($)</Label>
                        <Input type="number" value={tip} onChange={e => setTip(Number(e.target.value))} className="text-center font-bold"/>
                    </div>
                </div>

                <div className="border p-4 rounded-xl bg-gray-50">
                    <div className="flex items-center gap-2 mb-3">
                        <input type="checkbox" checked={isFactura} onChange={e => setIsFactura(e.target.checked)} id="fe" className="w-5 h-5 rounded text-slate-900 focus:ring-slate-900"/>
                        <Label htmlFor="fe" className="font-bold cursor-pointer text-slate-700">Generar Factura Electrónica</Label>
                    </div>
                    {isFactura && (
                        <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                            <Input placeholder="NIT / Cédula" value={clientData.nit} onChange={e => setClientData({...clientData, nit: e.target.value})}/>
                            <Input placeholder="Nombre Completo" value={clientData.name} onChange={e => setClientData({...clientData, name: e.target.value})}/>
                            <Input placeholder="Email" className="col-span-2" value={clientData.email} onChange={e => setClientData({...clientData, email: e.target.value})}/>
                        </div>
                    )}
                </div>
            </div>

            <DialogFooter className="gap-3 sm:justify-between">
                <Button variant="ghost" onClick={() => window.print()} className="text-gray-500"><Printer className="mr-2" size={18}/> Ticket</Button>
                <Button onClick={handlePay} className="bg-slate-900 hover:bg-slate-800 flex-1 h-12 text-lg font-bold">
                    CONFIRMAR PAGO
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL ARQUEO */}
      <Dialog open={isArqueoOpen} onOpenChange={setIsArqueoOpen}>
          <DialogContent>
              <DialogHeader><DialogTitle>Arqueo de Caja</DialogTitle></DialogHeader>
              <div className="space-y-6 py-6 text-center">
                  <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                      <Calculator size={32} className="text-slate-500"/>
                  </div>
                  <p className="text-gray-600">Por favor, cuenta el dinero físico en el cajón e ingrésalo abajo.</p>
                  <div className="relative max-w-xs mx-auto">
                      <span className="absolute left-4 top-3.5 text-gray-400 text-lg">$</span>
                      <Input 
                        className="pl-8 text-2xl font-bold text-center h-14" 
                        placeholder="0.00"
                        value={arqueoAmount}
                        onChange={e => setArqueoAmount(e.target.value)}
                      />
                  </div>
              </div>
              <DialogFooter>
                  <Button onClick={() => {toast("Turno cerrado correctamente. Informe generado.", "success"); setIsArqueoOpen(false);}} className="w-full h-12 text-lg">
                    Finalizar Turno
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}