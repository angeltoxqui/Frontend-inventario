import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/ui/Toast';
import { MockService } from '../../services/mockService';
import { Order, OrderItem, Product } from '../../types';
import { 
  Wallet, Receipt, CreditCard, Smartphone, Banknote, Printer, 
  Calculator, User, AlertTriangle, CheckCircle2, ShieldAlert, FileText, 
  Lock, Search, PackagePlus, Trash2, Coins
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';

export const Route = createFileRoute('/_layout/caja')({
  component: Caja,
})

function Caja() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const { toast } = useToast();
  
  // --- ESTADOS DE PAGO ---
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [itemsToPay, setItemsToPay] = useState<OrderItem[]>([]);
  const [payerName, setPayerName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo'|'tarjeta'|'nequi'>('efectivo');
  
  const [cashReceived, setCashReceived] = useState('');
  const [needsInvoice, setNeedsInvoice] = useState(false);
  const [clientInfo, setClientInfo] = useState({ nit: '', name: '', email: '', phone: '' });
  
  // Propina y Extras
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [tipType, setTipType] = useState<'none' | '10' | 'custom'>('none');
  const [customTipAmount, setCustomTipAmount] = useState('');

  // --- ESTADOS DE APERTURA Y CIERRE ---
  const [isOpeningOpen, setIsOpeningOpen] = useState(false);
  const [baseCash, setBaseCash] = useState<number>(0);
  const [isBaseSet, setIsBaseSet] = useState(false);

  const [isArqueoOpen, setIsArqueoOpen] = useState(false);
  const [stepArqueo, setStepArqueo] = useState<'input' | 'result'>('input');
  const [realCash, setRealCash] = useState('');
  const [systemCash, setSystemCash] = useState(0);
  const [arqueoDiff, setArqueoDiff] = useState(0);
  const [justification, setJustification] = useState('');

  // 1. CARGA DE DATOS Y SESIÓN PERSISTENTE
  useEffect(() => {
    loadData();
    checkSession();
    const i = setInterval(loadData, 5000); 
    return () => clearInterval(i);
  }, []);

  const checkSession = async () => {
      const session = await MockService.getBoxSession();
      if (session && session.isOpen) {
          setBaseCash(session.base);
          setIsBaseSet(true);
      }
  };

  const loadData = async () => {
    const orders = await MockService.getOrders();
    setPendingOrders(orders.filter(o => o.status === 'por_cobrar' || o.status === 'entregado'));
    const prods = await MockService.getProducts();
    setAllProducts(prods);
  };

  // 2. ABRIR CAJA (PERSISTENTE)
  const handleOpenBox = async () => {
      const base = parseFloat(realCash);
      if (isNaN(base) || base < 0) return toast("Monto inválido", "error");
      
      await MockService.openBox(base);
      setBaseCash(base);
      setIsBaseSet(true);
      setIsOpeningOpen(false);
      setRealCash('');
      toast(`Caja abierta con base de $${base.toLocaleString()}. Admin notificado 🔔`, "success");
  };

  // 3. INICIAR PAGO (CON BLOQUEO SI NO HAY CAJA ABIERTA)
  const openPayment = (order: Order, specificItems?: OrderItem[], name?: string) => {
    if (!isBaseSet) {
        toast("⚠️ DEBES ABRIR LA CAJA PRIMERO", "error");
        setIsOpeningOpen(true);
        return;
    }
    setSelectedOrder(order);
    setItemsToPay(specificItems || order.items);
    setPayerName(name || 'Cuenta Única');
    setPaymentMethod('efectivo');
    setCashReceived('');
    setNeedsInvoice(false);
    setClientInfo({ nit: '', name: '', email: '', phone: '' });
    setShowProductSearch(false);
    setTipType('none');
    setCustomTipAmount('');
    setIsPaymentOpen(true);
  };

  // Extras
  const addExtraProduct = (product: Product) => {
      const newItem: OrderItem = {
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: 1,
          assignedTo: 'Agregado en Caja',
          notes: ''
      };
      setItemsToPay(prev => [...prev, newItem]);
      setProductSearchTerm('');
      setShowProductSearch(false);
      toast(`${product.name} agregado a la cuenta`, "info");
  };

  const removeExtraItem = (idx: number) => {
      setItemsToPay(prev => prev.filter((_, i) => i !== idx));
  };

  // Cálculos con Propina
  const calculateSubtotal = () => itemsToPay.reduce((acc, i) => acc + i.price * i.quantity, 0);
  
  const calculateTip = () => {
      if (tipType === 'none') return 0;
      if (tipType === '10') return calculateSubtotal() * 0.10;
      return parseFloat(customTipAmount) || 0;
  };

  const calculateTotal = () => calculateSubtotal() + calculateTip();

  const calculateChange = () => {
      const total = calculateTotal();
      const received = parseFloat(cashReceived) || 0;
      return received - total;
  };

  const handlePay = async () => {
    if (selectedOrder) {
      const total = calculateTotal();
      
      if (paymentMethod === 'efectivo') {
          const received = parseFloat(cashReceived) || 0;
          if (received < total - 50) { // Tolerancia $50 pesos
              toast(`Falta dinero. Recibido: $${received.toLocaleString()}, Total: $${total.toLocaleString()}`, "error");
              return;
          }
      }

      if (needsInvoice && (!clientInfo.nit || !clientInfo.email)) {
          toast("NIT y Correo obligatorios para factura", "error");
          return;
      }

      await MockService.payOrder(selectedOrder.id, total, itemsToPay, paymentMethod);
      setIsPaymentOpen(false);
      loadData();
      toast("Pago registrado 💰", "success");
    }
  };

  // 4. ARQUEO Y CIERRE
  const openArqueo = async () => {
    if (!isBaseSet) {
        toast("⚠️ Primero debes realizar la APERTURA de caja.", "warning");
        setIsOpeningOpen(true);
        return;
    }

    const report = await MockService.getSalesReport();
    const today = new Date().toDateString();
    const salesCash = report.history
        .filter(s => new Date(s.timestamp).toDateString() === today && s.method === 'efectivo')
        .reduce((sum, s) => sum + s.total, 0);

    const totalExpected = salesCash + baseCash;
    setSystemCash(totalExpected);
    setRealCash('');
    setJustification('');
    setStepArqueo('input');
    setIsArqueoOpen(true);
  };

  const processArqueo = () => {
    const entered = parseFloat(realCash) || 0;
    const diff = entered - systemCash;
    setArqueoDiff(diff);
    setStepArqueo('result');
  };

  const closeTurn = async () => {
    if (arqueoDiff < 0 && justification.trim().length < 10) {
        toast("⛔ Debes explicar el faltante (mínimo 10 caracteres).", "error");
        return;
    }
    
    await MockService.registerClosing({
        user: 'Cajero Turno',
        systemExpected: systemCash, 
        realCounted: parseFloat(realCash),
        difference: arqueoDiff,
        status: arqueoDiff === 0 ? 'ok' : (arqueoDiff < 0 ? 'faltante' : 'sobrante'),
        justification: arqueoDiff < 0 ? justification : undefined,
        openingBase: baseCash
    });
    
    setBaseCash(0);
    setIsBaseSet(false);
    
    toast("Turno cerrado correctamente ✅", "success");
    setIsArqueoOpen(false);
  };

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
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Wallet className="text-slate-900"/> Terminal de Caja
        </h1>
        <div className="flex gap-2">
            {!isBaseSet ? (
                <Button onClick={() => setIsOpeningOpen(true)} className="bg-blue-600 text-white gap-2 h-12 px-6 text-lg hover:bg-blue-700 animate-pulse">
                    <Lock size={20}/> Apertura (Base)
                </Button>
            ) : (
                <div className="flex items-center gap-2 px-4 bg-green-100 text-green-800 rounded-lg border border-green-200">
                    <span className="text-xs font-bold uppercase">Base:</span>
                    <span className="font-mono font-bold">${baseCash.toLocaleString()}</span>
                </div>
            )}
            <Button onClick={openArqueo} className="bg-slate-900 text-white gap-2 h-12 px-6 text-lg hover:bg-slate-800">
                <Calculator size={20}/> Cierre de Caja
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingOrders.map(order => (
            <div key={order.id} className="bg-white border p-0 rounded-xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="bg-purple-50 p-4 border-b border-purple-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Mesa {order.tableId.replace('t-', '')}</h2>
                        {order.isSplit ? (
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-bold flex items-center gap-1 w-fit mt-1"><User size={12}/> CUENTA DIVIDIDA</span>
                        ) : (
                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-bold mt-1 inline-block">Cuenta Única</span>
                        )}
                    </div>
                    <span className="text-xs font-mono text-slate-400">ID: {order.id.slice(0,4)}</span>
                </div>

                <div className="p-4 flex-1">
                    {order.isSplit ? (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-500 font-medium">Sub-cuentas pendientes:</p>
                            {Object.entries(groupItemsByName(order.items)).map(([name, items]) => {
                                const subtotal = items.reduce((a, b) => a + b.price, 0);
                                return (
                                    <div key={name} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <div>
                                            <div className="flex items-center gap-2 font-bold text-slate-700"><User size={16} className="text-blue-500"/> {name}</div>
                                            <p className="text-xs text-gray-500">{items.length} items • ${subtotal.toLocaleString()}</p>
                                        </div>
                                        <Button size="sm" onClick={() => openPayment(order, items, name)} className="bg-white border hover:bg-green-50 text-green-700 hover:text-green-800 border-green-200">Cobrar</Button>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-gray-500 mb-2">Total a Pagar</p>
                            <p className="text-4xl font-black text-slate-900 mb-4">${order.items.reduce((a, b) => a + b.price, 0).toLocaleString()}</p>
                            <Button onClick={() => openPayment(order)} className="w-full bg-slate-900 hover:bg-slate-800 h-14 text-lg">Cobrar Todo</Button>
                        </div>
                    )}
                </div>
            </div>
          ))}
          {pendingOrders.length === 0 && (
            <div className="col-span-3 text-center py-20 bg-white rounded-xl border border-dashed flex flex-col items-center justify-center text-gray-400">
                <CheckCircle2 size={48} className="mb-2 opacity-20"/>
                <p className="text-xl">Caja al día. Sin cobros pendientes.</p>
            </div>
          )}
      </div>

      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-xl">Procesar Pago: <span className="text-blue-600">{payerName}</span></DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 h-fit flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><Receipt size={20}/> Factura</h3>
                        <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50 h-8" onClick={() => setShowProductSearch(!showProductSearch)}>
                            <PackagePlus size={16} className="mr-1"/> Agregar Ítem
                        </Button>
                    </div>
                    
                    {showProductSearch && (
                        <div className="mb-4 bg-white p-2 rounded-lg border shadow-sm animate-in slide-in-from-top-2">
                            <div className="relative">
                                <Search size={14} className="absolute left-2 top-2.5 text-gray-400"/>
                                <input 
                                    className="w-full pl-7 p-1.5 text-sm border rounded bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Buscar extra (ej: chicle)..."
                                    value={productSearchTerm}
                                    onChange={(e) => setProductSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                                {allProducts
                                    .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))
                                    .slice(0, 5)
                                    .map(p => (
                                        <div key={p.id} onClick={() => addExtraProduct(p)} className="flex justify-between p-2 hover:bg-blue-50 rounded cursor-pointer text-sm">
                                            <span>{p.name}</span>
                                            <span className="font-bold">${p.price}</span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    )}

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 flex-1">
                        {itemsToPay.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center py-2 border-b border-dashed border-slate-200 last:border-0 group">
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{item.productName}</p>
                                    <p className="text-xs text-slate-500">
                                        Cant: {item.quantity} 
                                        {item.assignedTo === 'Agregado en Caja' && <span className="text-blue-600 font-bold ml-1">(Extra)</span>}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="font-mono font-medium text-slate-700">${item.price.toLocaleString()}</p>
                                    {/* BOTÓN ELIMINAR (SOLO PARA EXTRAS) */}
                                    {item.assignedTo === 'Agregado en Caja' && (
                                        <button onClick={() => removeExtraItem(idx)} className="text-red-400 hover:text-red-600 transition-colors p-1" title="Eliminar ítem extra">
                                            <Trash2 size={16}/>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* TOTALES */}
                    <div className="mt-6 pt-4 border-t-2 border-slate-200 space-y-2">
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>Subtotal</span>
                            <span>${calculateSubtotal().toLocaleString()}</span>
                        </div>
                        {calculateTip() > 0 && (
                            <div className="flex justify-between text-sm text-green-600 font-bold">
                                <span>Propina / Servicio</span>
                                <span>+${calculateTip().toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                            <span className="font-bold text-slate-500 uppercase">Total Neto</span>
                            <span className="font-black text-3xl text-slate-900">${calculateTotal().toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* PROPINA */}
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <Label className="text-xs font-bold text-slate-400 uppercase mb-2 block flex items-center gap-1"><Coins size={14}/> Propina Sugerida</Label>
                        <div className="flex gap-2 mb-2">
                            <button onClick={() => setTipType('none')} className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-all ${tipType === 'none' ? 'bg-slate-200 border-slate-300 text-slate-800' : 'hover:bg-slate-50'}`}>No</button>
                            <button onClick={() => setTipType('10')} className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-all ${tipType === '10' ? 'bg-green-100 border-green-300 text-green-800' : 'hover:bg-slate-50'}`}>10%</button>
                            <button onClick={() => setTipType('custom')} className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-all ${tipType === 'custom' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'hover:bg-slate-50'}`}>Otro</button>
                        </div>
                        {tipType === 'custom' && (
                            <div className="relative animate-in fade-in zoom-in-95 duration-200">
                                <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                                <Input className="pl-6 h-10" placeholder="Monto propina..." type="number" value={customTipAmount} onChange={(e) => setCustomTipAmount(e.target.value)} autoFocus/>
                            </div>
                        )}
                    </div>

                    {/* MÉTODOS DE PAGO */}
                    <div>
                        <Label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Método de Pago</Label>
                        <div className="grid grid-cols-3 gap-3">
                            {['efectivo', 'tarjeta', 'nequi'].map(m => (
                                <button key={m} onClick={() => setPaymentMethod(m as any)} className={`p-3 rounded-lg border flex flex-col items-center gap-2 capitalize transition-all ${paymentMethod === m ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'hover:bg-slate-50'}`}>
                                    {m === 'efectivo' && <Banknote size={20}/>}
                                    {m === 'tarjeta' && <CreditCard size={20}/>}
                                    {m === 'nequi' && <Smartphone size={20}/>}
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    {paymentMethod === 'efectivo' && (
                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                            <Label className="text-yellow-800 font-bold mb-2 flex items-center gap-2"><Calculator size={16}/> Cambio</Label>
                            <div className="flex gap-4 items-center">
                                <div className="flex-1 relative">
                                    <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                                    <Input className="pl-6 bg-white border-yellow-200 font-bold text-lg" placeholder="Recibido..." type="number" value={cashReceived} onChange={e => setCashReceived(e.target.value)}/>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-yellow-600 font-bold uppercase">Devolver</p>
                                    <p className={`text-2xl font-black ${calculateChange() < 0 ? 'text-red-500' : 'text-green-600'}`}>${calculateChange().toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-4">
                            <Label className="font-bold text-slate-700 flex items-center gap-2"><FileText size={18}/> ¿Factura Electrónica?</Label>
                            <input type="checkbox" className="w-5 h-5 accent-slate-900 cursor-pointer" checked={needsInvoice} onChange={(e) => setNeedsInvoice(e.target.checked)}/>
                        </div>
                        {needsInvoice && (
                            <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                                <Input className="h-9 text-sm" placeholder="NIT / Cédula" value={clientInfo.nit} onChange={e => setClientInfo({...clientInfo, nit: e.target.value})}/>
                                <Input className="h-9 text-sm" placeholder="Nombre" value={clientInfo.name} onChange={e => setClientInfo({...clientInfo, name: e.target.value})}/>
                                <Input className="h-9 text-sm col-span-2" placeholder="Correo Electrónico" value={clientInfo.email} onChange={e => setClientInfo({...clientInfo, email: e.target.value})}/>
                                <Input className="h-9 text-sm col-span-2" placeholder="Teléfono" value={clientInfo.phone} onChange={e => setClientInfo({...clientInfo, phone: e.target.value})}/>
                            </div>
                        )}
                    </div>
                    <Button onClick={handlePay} className="w-full bg-slate-900 hover:bg-slate-800 h-14 text-lg font-bold shadow-xl transition-all active:scale-95">
                        CONFIRMAR PAGO <CheckCircle2 className="ml-2" size={20}/>
                    </Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isOpeningOpen} onOpenChange={(v) => !isBaseSet ? setIsOpeningOpen(true) : setIsOpeningOpen(v)}>
          <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => { if(!isBaseSet) e.preventDefault(); }}>
              <DialogHeader><DialogTitle>Apertura de Caja</DialogTitle></DialogHeader>
              <div className="py-6 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                      <Lock size={32}/>
                  </div>
                  <p className="text-slate-600 text-sm">Antes de iniciar, ingresa la <b>base en efectivo</b> (monedas y billetes) que recibes.</p>
                  <div className="relative max-w-[180px] mx-auto">
                      <span className="absolute left-3 top-2.5 text-gray-400 font-bold">$</span>
                      <Input 
                        className="pl-7 text-xl font-bold text-center h-12" 
                        type="number" 
                        placeholder="0"
                        value={realCash}
                        onChange={e => setRealCash(e.target.value)}
                        autoFocus
                      />
                  </div>
                  <Button onClick={handleOpenBox} className="w-full bg-blue-600 hover:bg-blue-700 font-bold">
                      Confirmar Apertura
                  </Button>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isArqueoOpen} onOpenChange={(open) => { if(!open) setStepArqueo('input'); setIsArqueoOpen(open); }}>
          <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Cierre de Caja</DialogTitle></DialogHeader>
              {stepArqueo === 'input' ? (
                <div className="space-y-6 py-6 text-center">
                    <p className="text-slate-800 font-medium">Ingresa el efectivo TOTAL en caja (Ventas + Base):</p>
                    <div className="relative max-w-xs mx-auto">
                        <span className="absolute left-4 top-3.5 text-gray-400 text-lg">$</span>
                        <Input className="pl-8 text-3xl font-bold text-center h-16 tracking-widest" type="number" value={realCash} onChange={e => setRealCash(e.target.value)} autoFocus/>
                    </div>
                    <Button onClick={processArqueo} className="w-full h-12 font-bold">Verificar</Button>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                    <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-1 mb-4 border">
                        <div className="flex justify-between"><span>Ventas Efectivo:</span> <span className="font-bold">${(systemCash - baseCash).toLocaleString()}</span></div>
                        <div className="flex justify-between text-blue-600"><span>+ Base Inicial:</span> <span className="font-bold">${baseCash.toLocaleString()}</span></div>
                        <div className="flex justify-between border-t pt-1 mt-1 text-slate-800"><span>= Total Esperado:</span> <span className="font-bold text-lg">${systemCash.toLocaleString()}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center border-b pb-4">
                        <div><p className="text-xs text-gray-500 font-bold">ESPERADO</p><p className="text-xl font-bold">${systemCash.toLocaleString()}</p></div>
                        <div><p className="text-xs text-gray-500 font-bold">CONTADO</p><p className="text-xl font-bold">${parseFloat(realCash).toLocaleString()}</p></div>
                    </div>
                    <div className="text-center p-4">
                        {arqueoDiff === 0 && <><CheckCircle2 size={48} className="text-green-500 mx-auto mb-2"/><h3 className="text-2xl font-black text-green-600">CUADRE PERFECTO</h3></>}
                        {arqueoDiff < 0 && <><ShieldAlert size={48} className="text-red-500 mx-auto mb-2"/><h3 className="text-2xl font-black text-red-600">FALTANTE</h3><p className="font-mono text-xl font-bold mt-1 text-red-600">{arqueoDiff.toLocaleString()}</p></>}
                        {arqueoDiff > 0 && <><AlertTriangle size={48} className="text-yellow-500 mx-auto mb-2"/><h3 className="text-2xl font-black text-yellow-600">SOBRANTE</h3><p className="font-mono text-xl font-bold mt-1">+{arqueoDiff.toLocaleString()}</p></>}
                    </div>
                    {arqueoDiff < 0 && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                            <Label className="text-red-700 font-bold flex items-center gap-2"><FileText size={16}/> Motivo del Faltante</Label>
                            <textarea className="w-full mt-2 p-3 text-sm border-red-200 rounded-md focus:ring-red-500 min-h-[80px]" placeholder="Explica la diferencia..." value={justification} onChange={e => setJustification(e.target.value)}/>
                        </div>
                    )}
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" onClick={() => setStepArqueo('input')} className="flex-1">Recontar</Button>
                        <Button onClick={closeTurn} disabled={arqueoDiff < 0 && justification.length < 10} className={`flex-1 font-bold text-white ${arqueoDiff < 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900'}`}>{arqueoDiff < 0 ? 'Reportar y Cerrar' : 'Finalizar Turno'}</Button>
                    </div>
                </div>
              )}
          </DialogContent>
      </Dialog>
    </div>
  );
}