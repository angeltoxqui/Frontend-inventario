import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../../components/ui/Toast';
import { MockService } from '../../services/mockService';
import { BillingService } from '../../services/billingService'; 
import { Order, OrderItem, Product } from '../../types';
import { 
  Wallet, Receipt, CreditCard, Smartphone, Banknote, 
  Calculator, User, AlertTriangle, CheckCircle2, ShieldAlert, FileText, 
  Lock, Search, PackagePlus, Trash2, Coins, Printer, X, Loader2, Camera
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch'; 
import { InvoiceTemplate } from '../../components/Caja/InvoiceTemplate';

export const Route = createFileRoute('/_layout/caja')({
  component: Caja,
})

function Caja() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const { toast } = useToast();
  
  // Ref para impresión
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [printData, setPrintData] = useState<any>(null);

  // --- ESTADOS DE PAGO ---
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isFacturaLoading, setIsFacturaLoading] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [itemsToPay, setItemsToPay] = useState<OrderItem[]>([]);
  const [payerName, setPayerName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo'|'tarjeta'|'Transferencia'>('efectivo');
  
  const [cashReceived, setCashReceived] = useState('');

  // [NUEVO] Estados para FOTO de Transferencia
  const [transferImage, setTransferImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Datos de cliente para facturación
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
  const [sessionStartTime, setSessionStartTime] = useState<number>(0); 

  const [isArqueoOpen, setIsArqueoOpen] = useState(false);
  const [stepArqueo, setStepArqueo] = useState<'input' | 'result'>('input');
  const [realCash, setRealCash] = useState('');
  const [systemCash, setSystemCash] = useState(0);
  const [arqueoDiff, setArqueoDiff] = useState(0);
  const [justification, setJustification] = useState('');

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
          setSessionStartTime(session.startTime); 
          setIsBaseSet(true);
      }
  };

  const loadData = async () => {
    const orders = await MockService.getOrders();
    // [CORRECCIÓN IMPORTANTE] Filtramos también por estado 'pagando'
    setPendingOrders(orders.filter(o => 
        o.status === 'por_cobrar' || 
        (o.status as any) === 'pagando' 
    ));
    const prods = await MockService.getProducts();
    setAllProducts(prods);
  };

  const handleOpenBox = async () => {
      const base = parseFloat(realCash);
      if (isNaN(base) || base < 0) return toast("Monto inválido", "error");
      await MockService.openBox(base);
      setBaseCash(base);
      setSessionStartTime(Date.now()); 
      setIsBaseSet(true);
      setIsOpeningOpen(false);
      setRealCash('');
      toast(`Caja abierta con base de $${base.toLocaleString()}. Admin notificado`, "success");
  };

  const openPayment = (order: Order, specificItems?: OrderItem[], name?: string) => {
    if (!isBaseSet) {
        toast("Debes abrir la caja primero", "error");
        setIsOpeningOpen(true);
        return;
    }
    setSelectedOrder(order);
    setItemsToPay(specificItems || order.items);
    setPayerName(name || 'Cuenta Única');
    
    // Resetear formulario
    setPaymentMethod('efectivo');
    setCashReceived('');
    
    // [NUEVO] Limpiar foto anterior
    setTransferImage(null);
    setImagePreview(null);
    
    setNeedsInvoice(false);
    setClientInfo({ nit: '', name: '', email: '', phone: '' });
    setShowProductSearch(false);
    setTipType('none');
    setCustomTipAmount('');
    
    setPaymentSuccess(false); 
    setIsFacturaLoading(false);
    setPrintData(null);
    
    setIsPaymentOpen(true);
  };

  // [NUEVO] Manejador de selección de imagen
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTransferImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

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

  const handlePrint = () => {
      setTimeout(() => {
          window.print();
      }, 100);
  };

  const handleClosePaymentModal = () => {
      setIsPaymentOpen(false);
  }

  // --- [LÓGICA PRINCIPAL DE PAGO Y FACTURACIÓN] ---
  const handlePay = async () => {
    if (selectedOrder) {
      const total = calculateTotal();
      const subtotal = calculateSubtotal();
      const tip = calculateTip();
      
      // Validación de efectivo
      if (paymentMethod === 'efectivo') {
          const received = parseFloat(cashReceived) || 0;
          if (received < total - 50) { 
              toast(`Falta dinero. Recibido: $${received.toLocaleString()}, Total: $${total.toLocaleString()}`, "error");
              return;
          }
      }

      // [NUEVO] Validación de Transferencia (FOTO OBLIGATORIA)
      if (paymentMethod === 'Transferencia') {
          if (!transferImage) {
              toast("Es obligatorio tomar la foto del comprobante", "error");
              return;
          }
      }

      // Validación de Facturación
      if (needsInvoice && (!clientInfo.nit || !clientInfo.email)) {
          toast("Error: NIT y Correo obligatorios para Factura Electrónica", "error");
          return;
      }

      try {
          setIsFacturaLoading(true); 

          // Simulación de subida de imagen (si fuera real usaríamos FormData)
          if (paymentMethod === 'Transferencia' && transferImage) {
             console.log("Subiendo imagen de evidencia:", transferImage.name);
             // await MockService.uploadProof(selectedOrder.id, transferImage); 
          }

          // Nota sobre la evidencia
          const notes = paymentMethod === 'Transferencia' ? 'Comprobante: [IMAGEN ADJUNTA]' : '';

          // 1. Guardar pago local (Inventario)
          await MockService.payOrder(selectedOrder.id, total, itemsToPay, paymentMethod);
          
          let invoiceData = null;

          // 2. Procesar Factura Electrónica (Si se requiere)
          if (needsInvoice) {
              try {
                  toast("Conectando con DIAN...", "info");
                  const response = await BillingService.emitInvoice(
                      selectedOrder, itemsToPay, clientInfo, paymentMethod
                  );
                  invoiceData = response.data; 
                  toast("¡Factura Electrónica Generada!", "success");
              } catch (billingError) {
                  console.error(billingError);
                  toast("Pago OK, pero falló la Factura Electrónica. Verifica logs.", "warning");
              }
          }

          // 3. Preparar datos para el Ticket
          setPrintData({
              order: { 
                  ...selectedOrder, 
                  items: itemsToPay, 
                  id: `${selectedOrder.id}-PAID` 
              },
              subtotal,
              tip,
              total,
              paymentMethod,
              cashReceived: parseFloat(cashReceived) || 0,
              change: calculateChange(),
              clientName: payerName !== 'Cuenta Única' ? payerName : (needsInvoice ? clientInfo.name : undefined),
              
              invoiceCufe: invoiceData?.cufe,
              invoiceQr: invoiceData?.qr_image,
              invoiceNumber: invoiceData?.number
          });

          // 4. Finalizar
          setPaymentSuccess(true);
          
          setPendingOrders(currentOrders => 
              currentOrders.filter(o => o.id !== selectedOrder.id)
          );

      } catch (error: any) {
          console.error("Error al procesar pago:", error);
          toast(error.message || "Error desconocido", "error");
      } finally {
          setIsFacturaLoading(false);
      }
    }
  };

  const openArqueo = async () => {
    if (!isBaseSet) {
        toast("Primero debes realizar la APERTURA de caja.", "warning");
        setIsOpeningOpen(true);
        return;
    }
    const report = await MockService.getSalesReport();
    const salesCash = report.history.filter(s => s.method === 'efectivo' && s.timestamp >= sessionStartTime).reduce((sum, s) => sum + s.total, 0);
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
        toast("Debes explicar el faltante (mínimo 10 caracteres).", "error");
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
    setSessionStartTime(0); 
    setIsBaseSet(false);
    toast("Turno cerrado correctamente", "success");
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
      
      <div id="printable-invoice-area" className="hidden print:block">
          {printData && (
              <InvoiceTemplate 
                  ref={invoiceRef}
                  order={printData.order}
                  subtotal={printData.subtotal}
                  tip={printData.tip}
                  total={printData.total}
                  paymentMethod={printData.paymentMethod}
                  cashReceived={printData.cashReceived}
                  change={printData.change}
                  clientName={printData.clientName}
              />
          )}
      </div>

      <div className="flex justify-between items-center mb-8 print:hidden">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
          {pendingOrders.map(order => (
            <div key={order.id} className="bg-white border p-0 rounded-xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="bg-purple-50 p-6 border-b border-purple-100 flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900">Mesa {order.tableId.replace('t-', '')}</h2>
                        <span className="text-xs font-mono text-slate-400">ID: {order.id.slice(0,4)}</span>
                        {/* Indicador visual si está en estado PAGANDO */}
                        {(order.status as any) === 'pagando' && (
                           <span className="ml-2 bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">SOLICITAN CUENTA</span>
                        )}
                    </div>
                    {order.isSplit ? (
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-bold flex items-center gap-1"><User size={12}/> DIVIDIDA</span>
                    ) : (
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-bold">Única</span>
                    )}
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
                                            <p className="text-xs text-gray-500">{items.length} items</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-slate-900">${subtotal.toLocaleString()}</p>
                                            <Button size="sm" onClick={() => openPayment(order, items, name)} className="h-7 text-xs bg-white border hover:bg-green-50 text-green-700 hover:text-green-800 border-green-200 mt-1">Cobrar</Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-gray-500 mb-1 text-sm font-bold uppercase">Total a Pagar</p>
                            <p className="text-5xl font-black text-slate-900 mb-6 tracking-tight">${order.items.reduce((a, b) => a + b.price, 0).toLocaleString()}</p>
                            <Button onClick={() => openPayment(order)} className="w-full bg-slate-900 hover:bg-slate-800 h-14 text-lg font-bold shadow-lg">Cobrar Todo</Button>
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
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto print:hidden">
            <DialogHeader>
                <DialogTitle className="text-xl flex justify-between items-center">
                    <span>Procesar Pago: <span className="text-blue-600 font-bold">{payerName}</span></span>
                    {paymentSuccess && (
                        <Button variant="ghost" size="sm" onClick={handleClosePaymentModal} className="text-slate-400 hover:text-red-500">
                            <X size={20}/> Cerrar
                        </Button>
                    )}
                </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                
                {/* COLUMNA IZQUIERDA: DETALLES */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 h-fit flex flex-col h-full opacity-100 transition-opacity">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><Receipt size={20}/> Detalle Factura</h3>
                        {!paymentSuccess && (
                            <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50 h-8" onClick={() => setShowProductSearch(!showProductSearch)}>
                                <PackagePlus size={16} className="mr-1"/> Agregar Extra
                            </Button>
                        )}
                    </div>
                    
                    {showProductSearch && !paymentSuccess && (
                        <div className="mb-4 bg-white p-2 rounded-lg border shadow-sm animate-in slide-in-from-top-2">
                            <div className="relative">
                                <Search size={14} className="absolute left-2 top-2.5 text-gray-400"/>
                                <input 
                                    className="w-full pl-7 p-1.5 text-sm border rounded bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Buscar extra..."
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
                                    <p className="font-bold text-slate-700 text-sm">{item.productName}</p>
                                    <p className="text-xs text-slate-400">Cant: {item.quantity}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="font-mono font-medium text-slate-600">${item.price.toLocaleString()}</p>
                                    {item.assignedTo === 'Agregado en Caja' && !paymentSuccess && (
                                        <button onClick={() => removeExtraItem(idx)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                                            <Trash2 size={16}/>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-4 border-t-2 border-slate-200 space-y-2">
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>Subtotal</span>
                            <span>${calculateSubtotal().toLocaleString()}</span>
                        </div>
                        {calculateTip() > 0 && (
                            <div className="flex justify-between text-sm text-green-600 font-bold">
                                <span>Propina</span>
                                <span>+${calculateTip().toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                            <span className="font-bold text-slate-500 uppercase text-xs">Total Neto</span>
                            <span className="font-black text-2xl text-slate-800">${calculateTotal().toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: PAGO Y FACTURACIÓN */}
                <div className="space-y-6 flex flex-col justify-between">
                    
                    {!paymentSuccess ? (
                        <>
                            <div>
                                <div className="text-center mb-6">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total a Pagar</p>
                                    <p className="text-6xl font-black text-slate-900 tracking-tighter">${calculateTotal().toLocaleString()}</p>
                                </div>

                                <div className="bg-white mb-6">
                                    <Label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Propina</Label>
                                    <div className="flex gap-2">
                                        <button onClick={() => setTipType('none')} className={`flex-1 py-2 text-sm rounded-lg border font-medium ${tipType === 'none' ? 'bg-slate-800 text-white' : 'bg-slate-50'}`}>No</button>
                                        <button onClick={() => setTipType('10')} className={`flex-1 py-2 text-sm rounded-lg border font-medium ${tipType === '10' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-slate-50'}`}>10%</button>
                                        <button onClick={() => setTipType('custom')} className={`flex-1 py-2 text-sm rounded-lg border font-medium ${tipType === 'custom' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-slate-50'}`}>Otro</button>
                                    </div>
                                    {tipType === 'custom' && (
                                        <Input className="mt-2 text-center" placeholder="Monto..." type="number" value={customTipAmount} onChange={(e) => setCustomTipAmount(e.target.value)} autoFocus/>
                                    )}
                                </div>

                                <div className="mb-6">
                                    <Label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Método</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['efectivo', 'tarjeta', 'Transferencia'].map(m => (
                                            <button key={m} onClick={() => setPaymentMethod(m as any)} className={`p-4 rounded-xl border flex flex-col items-center gap-2 capitalize transition-all ${paymentMethod === m ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105' : 'bg-white hover:bg-slate-50 text-slate-500'}`}>
                                                {m === 'efectivo' && <Banknote size={24}/>}
                                                {m === 'tarjeta' && <CreditCard size={24}/>}
                                                {m === 'Transferencia' && <Smartphone size={24}/>}
                                                <span className="text-xs font-bold">{m}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* [NUEVO] BLOQUE PARA FOTO DE TRANSFERENCIA */}
                                {paymentMethod === 'Transferencia' && (
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 animate-in fade-in slide-in-from-bottom-2">
                                        <h4 className="text-blue-800 font-bold mb-3 flex items-center gap-2 text-sm">
                                            <Smartphone size={18}/> Comprobante de Transferencia
                                        </h4>
                                        
                                        <div className="flex flex-col items-center gap-4">
                                            {/* Área de Previsualización o Botón de Carga */}
                                            <div className="w-full">
                                                <label 
                                                    htmlFor="transfer-photo" 
                                                    className={`
                                                        flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors
                                                        ${imagePreview ? 'border-blue-400 bg-white' : 'border-blue-300 bg-blue-50 hover:bg-blue-100'}
                                                    `}
                                                >
                                                    {imagePreview ? (
                                                        <div className="relative w-full h-full p-2 group">
                                                            <img src={imagePreview} alt="Comprobante" className="w-full h-full object-contain rounded-lg"/>
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                                                <span className="text-white font-bold flex items-center gap-2"><Camera size={20}/> Cambiar Foto</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-blue-500">
                                                            <div className="bg-blue-200 p-3 rounded-full mb-2 text-blue-700">
                                                                <Camera size={32} />
                                                            </div>
                                                            <p className="mb-1 text-sm font-bold">Tocar para tomar foto</p>
                                                            <p className="text-xs">o subir archivo</p>
                                                        </div>
                                                    )}
                                                    
                                                    <input 
                                                        id="transfer-photo" 
                                                        type="file" 
                                                        accept="image/*" 
                                                        capture="environment" // IMPORTANTE: Abre cámara trasera en móviles
                                                        className="hidden" 
                                                        onChange={handleImageSelect}
                                                    />
                                                </label>
                                            </div>

                                            {imagePreview && (
                                                <p className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                                                    <CheckCircle2 size={12}/> Imagen cargada correctamente
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {paymentMethod === 'efectivo' && (
                                    <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-100 mb-6">
                                        <div className="flex gap-6 items-center">
                                            <div className="flex-1">
                                                <Label className="text-yellow-800 font-bold mb-1 block text-xs uppercase">Dinero Recibido</Label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-3 text-yellow-600 font-bold">$</span>
                                                    <Input className="pl-6 bg-white border-yellow-200 font-bold text-2xl h-14 text-slate-900" placeholder="0" type="number" value={cashReceived} onChange={e => setCashReceived(e.target.value)}/>
                                                </div>
                                            </div>
                                            <div className="text-right min-w-[120px]">
                                                <p className="text-xs text-yellow-700 font-bold uppercase mb-1">Su Cambio</p>
                                                <p className={`text-4xl font-black tracking-tight ${calculateChange() < 0 ? 'text-red-500' : 'text-green-600'}`}>${calculateChange().toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* --- SECCIÓN DE FACTURACIÓN ELECTRÓNICA --- */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <Label className="text-slate-800 font-bold flex items-center gap-2">
                                        <FileText size={16} className="text-blue-600"/> Facturación Electrónica
                                    </Label>
                                    <Switch checked={needsInvoice} onCheckedChange={setNeedsInvoice} />
                                </div>

                                {needsInvoice && (
                                    <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-bold text-slate-500">NIT / Cédula</Label>
                                            <Input 
                                               value={clientInfo.nit} 
                                               onChange={e => setClientInfo({...clientInfo, nit: e.target.value})} 
                                               className="bg-white h-9" 
                                               placeholder="Ej: 123456789"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-bold text-slate-500">Nombre / Razón Social</Label>
                                            <Input 
                                               value={clientInfo.name} 
                                               onChange={e => setClientInfo({...clientInfo, name: e.target.value})} 
                                               className="bg-white h-9"
                                               placeholder="Ej: Cliente Final"
                                            />
                                        </div>
                                        <div className="space-y-1 col-span-2">
                                            <Label className="text-xs font-bold text-slate-500">Email (Para enviar XML)</Label>
                                            <Input 
                                               value={clientInfo.email} 
                                               onChange={e => setClientInfo({...clientInfo, email: e.target.value})} 
                                               className="bg-white h-9"
                                               placeholder="cliente@email.com"
                                            />
                                        </div>
                                        <div className="space-y-1 col-span-2">
                                            <Label className="text-xs font-bold text-slate-500">Teléfono</Label>
                                            <Input 
                                               value={clientInfo.phone} 
                                               onChange={e => setClientInfo({...clientInfo, phone: e.target.value})} 
                                               className="bg-white h-9"
                                               placeholder="300 123 4567"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button 
                                onClick={handlePay} 
                                disabled={isFacturaLoading}
                                className="w-full bg-slate-900 hover:bg-slate-800 h-16 text-xl font-bold shadow-xl transition-all active:scale-95"
                            >
                                {isFacturaLoading ? (
                                    <span className="flex items-center gap-2"><Loader2 className="animate-spin"/> PROCESANDO DIAN...</span>
                                ) : (
                                    <>CONFIRMAR PAGO <CheckCircle2 className="ml-2" size={24}/></>
                                )}
                            </Button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full animate-in fade-in zoom-in-95 duration-300">
                            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
                                <CheckCircle2 size={64}/>
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 mb-2">¡Pago Exitoso!</h2>
                            <p className="text-slate-500 mb-8 text-center">
                                La orden ha sido cerrada y el inventario actualizado.
                                {needsInvoice && <span className="block text-blue-600 font-bold mt-2">Factura Electrónica Emitida</span>}
                            </p>
                            
                            <div className="flex flex-col gap-4 w-full">
                                <Button 
                                    onClick={handlePrint} 
                                    className="w-full bg-slate-900 text-white h-16 text-xl font-bold shadow-xl flex items-center justify-center gap-3 hover:bg-slate-800"
                                >
                                    <Printer size={28}/> IMPRIMIR FACTURA
                                </Button>
                                <Button 
                                    variant="outline"
                                    onClick={handleClosePaymentModal} 
                                    className="w-full h-12 text-slate-500 hover:text-slate-900 border-2"
                                >
                                    Cerrar y Atender Siguiente
                                </Button>
                            </div>
                        </div>
                    )}
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