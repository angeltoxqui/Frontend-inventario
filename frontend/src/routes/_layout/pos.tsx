import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useMemo, useEffect } from 'react'; 
import { useQuery, useQueryClient } from '@tanstack/react-query'; 
import { MockService } from '../../services/mockService';
import { Product, Table, OrderItem } from '../../types'; 
import { useToast } from '../../components/ui/Toast';
import { 
  Search, Send, ArrowLeft, Users, Trash2, ChevronDown, ChevronUp, 
  Info, Loader2, ShoppingCart, CheckCircle2, Receipt,
  Utensils, Clock, Wallet, ChefHat, Armchair 
} from 'lucide-react'; 
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';

export const Route = createFileRoute('/_layout/pos')({
  component: POS,
})

function POS() {
  const queryClient = useQueryClient(); 
  const { toast } = useToast();

  const [view, setView] = useState<'map' | 'order'>('map');
  
  const [cart, setCart] = useState<OrderItem[]>(() => {
      const saved = localStorage.getItem('pos_current_cart');
      return saved ? JSON.parse(saved) : [];
  });

  const [selectedTable, setSelectedTable] = useState<Table | null>(() => {
      const saved = localStorage.getItem('pos_selected_table');
      return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
      localStorage.setItem('pos_current_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
      if (selectedTable) {
          localStorage.setItem('pos_selected_table', JSON.stringify(selectedTable));
      } else {
          localStorage.removeItem('pos_selected_table');
      }
  }, [selectedTable]);

  useEffect(() => {
      const hasItemsInCart = cart.length > 0;
      if (selectedTable && hasItemsInCart) {
          setView('order');
      } else {
          if (selectedTable) {
              setSelectedTable(null);
              localStorage.removeItem('pos_selected_table');
          }
          setView('map');
      }
  }, []); 

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);

  const { data: tables = [], isLoading: loadingTables } = useQuery({
    queryKey: ['tables'],
    queryFn: MockService.getTables,
    refetchInterval: 3000, 
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: MockService.getProducts,
    staleTime: 1000 * 60, 
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: MockService.getIngredients,
    staleTime: 1000 * 60,
  });

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const getProductIngredientsNames = (product: Product) => {
    if (!product.recipe || product.recipe.length === 0) return [];
    return product.recipe.map(item => {
        const ing = ingredients.find(i => i.id === item.ingredientId);
        return ing ? ing.name : 'Desconocido';
    });
  };

  const toggleIngredients = (e: React.MouseEvent, productId: string) => {
      e.stopPropagation(); 
      setExpandedProductId(prev => prev === productId ? null : productId);
  };

  const getTableVisuals = (status: string) => {
    switch (status) {
      case 'libre': 
        return {
            container: 'bg-white border-2 border-slate-200 text-slate-600 hover:border-green-400 hover:bg-green-50',
            icon: <Armchair size={24} className="text-slate-300 group-hover:text-green-500 transition-colors" />,
            glow: 'shadow-sm hover:shadow-green-100',
            label: 'Disponible',
            badge: 'bg-slate-100 text-slate-500 group-hover:bg-green-100 group-hover:text-green-700'
        };
      case 'cocinando': 
        return {
            container: 'bg-gradient-to-br from-orange-50 to-white border-2 border-orange-400 text-orange-800',
            icon: <ChefHat size={24} className="text-orange-500 animate-pulse" />,
            glow: 'shadow-lg shadow-orange-100 ring-2 ring-orange-100 ring-offset-2',
            label: 'Cocina',
            badge: 'bg-orange-100 text-orange-700'
        };
      case 'servir': 
        return {
            container: 'bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-500 text-emerald-800',
            icon: <CheckCircle2 size={24} className="text-emerald-500 animate-bounce" />,
            glow: 'shadow-xl shadow-emerald-200 ring-2 ring-emerald-200 ring-offset-2',
            label: 'Listo',
            badge: 'bg-emerald-500 text-white shadow-md'
        };
      case 'comiendo': 
        return {
            container: 'bg-white border-2 border-blue-200 text-blue-900',
            icon: <Utensils size={24} className="text-blue-500" />,
            glow: 'shadow-md shadow-blue-100',
            label: 'Ocupada',
            badge: 'bg-blue-100 text-blue-700'
        };
      case 'pagando': 
        return {
            container: 'bg-gradient-to-br from-purple-50 to-white border-2 border-purple-400 text-purple-900',
            icon: <Wallet size={24} className="text-purple-600" />,
            glow: 'shadow-lg shadow-purple-100',
            label: 'Pagando',
            badge: 'bg-purple-100 text-purple-700 font-bold'
        };
      default: 
        return {
            container: 'bg-gray-100',
            icon: <Info />,
            glow: '',
            label: status,
            badge: 'bg-gray-200'
        };
    }
  };

  const getElapsedMinutes = (timestamp?: number) => {
    if (!timestamp) return 0;
    const now = Date.now();
    const diff = now - timestamp;
    return Math.floor(diff / 60000); 
  };

  const handleTableClick = (t: Table) => {
    const freshTable = tables.find(table => table.id === t.id) || t;
    setSelectedTable(freshTable);
    
    if (freshTable.status === 'libre') {
      const savedTable = localStorage.getItem('pos_selected_table');
      const parsedSaved = savedTable ? JSON.parse(savedTable) : null;
      
      if (parsedSaved && parsedSaved.id !== freshTable.id) {
          setCart([]); 
      }
      setView('order');
    } else {
      setIsActionModalOpen(true);
    }
  };

  const addToCart = (p: Product) => {
    setCart(prev => [...prev, { productId: p.id, productName: p.name, price: p.price, quantity: 1, assignedTo: 'Mesa', notes: '' }]);
  };

  const removeFromCart = (indexToRemove: number) => {
      setCart(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const updateItemNote = (index: number, note: string) => {
      const newCart = [...cart];
      newCart[index].notes = note;
      setCart(newCart);
  };

  const sendOrder = async () => {
    if (!selectedTable) return;
    await MockService.createOrder({
      id: Math.random().toString().slice(2, 8),
      tableId: selectedTable.id,
      items: cart,
      status: 'pendiente',
      timestamp: Date.now(),
      total: cart.reduce((acc, i) => acc + i.price, 0)
    });
    
    await queryClient.invalidateQueries({ queryKey: ['tables'] }); 
    await queryClient.invalidateQueries({ queryKey: ['orders'] }); 
    
    setCart([]);
    setSelectedTable(null);
    localStorage.removeItem('pos_current_cart');
    localStorage.removeItem('pos_selected_table');
    
    toast("Pedido enviado a Cocina", "success");
    setView('map');
  };

  const handleServe = async () => {
    if (selectedTable) {
      await MockService.serveTable(selectedTable.id);
      setIsActionModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast("Mesa servida", "success");
    }
  };

  const handleRequestBill = async (split: boolean) => {
    if (!selectedTable) return;
    
    if (split) {
      setIsActionModalOpen(false);
      setIsSplitModalOpen(true);
    } else {
      await MockService.requestBill(selectedTable.id, { isSplit: false, items: [] });
      setIsActionModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast("Cuenta enviada a Caja", "success");
    }
  };

  const confirmSplit = async () => {
      if(!selectedTable) return;
      const dummyItems: OrderItem[] = [
          { productId: 'p-1', productName: 'Hamburguesa', price: 25000, quantity: 1, assignedTo: 'Juan', notes: '' },
          { productId: 'p-2', productName: 'Coca Cola', price: 5000, quantity: 1, assignedTo: 'Juan', notes: '' },
          { productId: 'p-1', productName: 'Hamburguesa', price: 25000, quantity: 1, assignedTo: 'Maria', notes: '' },
      ];
      await MockService.requestBill(selectedTable.id, { isSplit: true, items: dummyItems });
      setIsSplitModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast("Cuenta dividida enviada a Caja", "success");
  }

  if (view === 'map') {
    if (loadingTables) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={40} /></div>;

    return (
      <div className="p-6 h-screen bg-slate-50 overflow-y-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sala Principal</h1>
                <p className="text-slate-500 text-sm">Gestión de mesas</p>
            </div>
            
            <div className="flex flex-wrap gap-2 text-[10px] font-semibold bg-white p-2 rounded-xl shadow-sm border">
                <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-slate-600"><Armchair size={12}/> Libre</div>
                <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded border border-orange-100"><ChefHat size={12}/> Cocina</div>
                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-100"><CheckCircle2 size={12}/> Listo</div>
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100"><Utensils size={12}/> Ocupado</div>
                <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded border border-purple-100"><Wallet size={12}/> Pagando</div>
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 pb-20">
          {tables.map(t => {
            const style = getTableVisuals(t.status);
            return (
                <button
                key={t.id}
                onClick={() => handleTableClick(t)}
                className={`
                    group relative aspect-square rounded-2xl flex flex-col justify-between p-3 
                    transition-all duration-300 hover:-translate-y-1 active:scale-95 active:duration-100
                    ${style.container} ${style.glow}
                `}
                >
                <div className="flex justify-between items-start w-full">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold ${style.badge}`}>
                        {style.label}
                    </span>
                    {style.icon}
                </div>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-4xl font-black tracking-tighter opacity-90">
                        {t.number}
                    </span>
                </div>

                <div className="flex justify-between items-end w-full text-[10px] font-medium opacity-70 mt-auto z-10">
                    {t.status !== 'libre' ? (
                        <span className={`flex items-center gap-1 ${getElapsedMinutes(t.timestamp) > 60 ? 'text-red-600 font-bold animate-pulse' : ''}`}>
                            <Clock size={10}/> 
                            {getElapsedMinutes(t.timestamp)}m
                        </span>
                    ) : (
                        <span></span>
                    )}
                </div>
                </button>
            );
          })}
        </div>

        <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
          <DialogContent className="sm:max-w-xs rounded-2xl">
            <DialogHeader><DialogTitle className="text-xl text-center font-bold">Mesa {selectedTable?.number}</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="bg-slate-50 p-3 rounded-xl text-center border mb-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Estado</p>
                  <span className="text-xl font-black uppercase text-slate-800">
                    {tables.find(t => t.id === selectedTable?.id)?.status || selectedTable?.status}
                  </span>
              </div>
              
              {(() => {
                 const currentStatus = tables.find(t => t.id === selectedTable?.id)?.status;
                 return (
                   <>
                    {currentStatus === 'servir' && (
                        <Button onClick={handleServe} className="bg-emerald-600 hover:bg-emerald-700 h-12 text-lg font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95">
                           <CheckCircle2 className="mr-2" size={20}/> Servir Todo
                        </Button>
                    )}
                    {(currentStatus === 'comiendo' || currentStatus === 'servir') && (
                        <div className="flex flex-col gap-2 mt-1">
                            <Button onClick={() => handleRequestBill(false)} className="bg-slate-900 hover:bg-slate-800 h-12 text-base shadow-xl transition-all active:scale-95">
                                <Receipt className="mr-2" size={18}/> Cuenta Única
                            </Button>
                            <Button onClick={() => handleRequestBill(true)} variant="outline" className="border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 h-10 font-bold transition-colors">
                                <Users className="mr-2" size={16}/> Cuenta Separada
                            </Button>
                        </div>
                    )}
                    {currentStatus === 'cocinando' && (
                        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100 text-center">
                             <Loader2 className="animate-spin mx-auto text-yellow-600 mb-2" size={24}/>
                             <p className="font-bold text-yellow-800 text-sm">Cocinando...</p>
                        </div>
                    )}
                    {currentStatus === 'pagando' && (
                        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 text-center">
                            <Receipt className="mx-auto text-purple-600 mb-2" size={24}/>
                            <p className="font-bold text-purple-800 text-sm">Procesando Pago</p>
                        </div>
                    )}
                    {currentStatus === 'libre' && (
                         <Button onClick={() => { setIsActionModalOpen(false); setView('order'); }} className="bg-blue-600 w-full">
                            Tomar Pedido
                         </Button>
                    )}
                   </>
                 )
              })()}
            </div>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isSplitModalOpen} onOpenChange={setIsSplitModalOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Dividir Cuenta (Demo)</DialogTitle></DialogHeader>
                <div className="py-4 text-center space-y-4">
                    <Users size={48} className="mx-auto text-blue-500"/>
                    <p>En esta demo, simularemos que la mesa dividió la cuenta entre <b>Juan</b> y <b>Maria</b>.</p>
                </div>
                <DialogFooter>
                    <Button onClick={confirmSplit} className="w-full bg-slate-900">Enviar a Caja</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-white overflow-hidden">
      {/* PANEL IZQUIERDO: PRODUCTOS */}
      <div className="flex-1 p-3 overflow-y-auto border-r custom-scrollbar">
        <div className="mb-3 flex gap-2 sticky top-0 bg-white z-10 py-1">
            <Button variant="outline" size="sm" onClick={() => setView('map')}><ArrowLeft size={16}/> Volver</Button>
            <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 text-gray-400" size={14}/>
                <input 
                    className="w-full pl-8 p-1.5 border rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all text-sm" 
                    placeholder="Buscar..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* Grid compactado */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 pb-20">
            {filteredProducts.map(p => {
                    const ingredientNames = getProductIngredientsNames(p);
                    const hasIngredients = ingredientNames.length > 0;
                    const isExpanded = expandedProductId === p.id;
                    return (
                        <div key={p.id} onClick={() => addToCart(p)} className="border p-3 rounded-lg hover:bg-slate-50 cursor-pointer shadow-sm transition-all active:scale-95 group relative select-none bg-white">
                            <div className="flex justify-between items-start mb-1">
                                <p className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{p.name}</p>
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-600 whitespace-nowrap">${(p.price/1000).toFixed(0)}k</span>
                            </div>
                            {hasIngredients && (
                                <div className="mt-1">
                                    <button onClick={(e) => toggleIngredients(e, p.id)} className="text-[10px] flex items-center gap-1 text-blue-600 font-medium hover:bg-blue-50 px-1 py-0.5 rounded -ml-1 transition-colors">
                                        <Info size={12}/> {isExpanded ? 'Ocultar' : 'Info'} 
                                        {isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                    </button>
                                    {isExpanded && (
                                        <div className="mt-1 p-1 bg-blue-50 rounded border border-blue-100 animate-in slide-in-from-top-1 fade-in duration-200">
                                            <div className="flex flex-wrap gap-1">
                                                {ingredientNames.map((name, i) => <span key={i} className="text-[9px] bg-white border border-blue-200 text-slate-600 px-1 py-0 rounded shadow-sm">{name}</span>)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
        </div>
      </div>

      {/* PANEL DERECHO: CARRITO */}
      <div className="w-full md:w-80 lg:w-96 bg-slate-50 flex flex-col shadow-xl h-[40vh] md:h-auto border-t md:border-t-0 z-20">
        <div className="p-3 bg-slate-900 text-white flex justify-between items-center">
            <div>
                <h2 className="font-bold text-base">Mesa {selectedTable?.number}</h2>
                <p className="text-[10px] text-slate-400">Nueva Comanda</p>
            </div>
            <div className="bg-slate-800 px-2 py-1 rounded text-xs font-mono">
                Items: {cart.length}
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {cart.length === 0 ? (
                <div className="text-center mt-10 opacity-50"><ShoppingCart size={32} className="mx-auto mb-2 text-slate-300" /><p className="text-slate-400 text-sm font-medium">Carrito vacío</p></div>
            ) : (
                cart.map((item, idx) => (
                    <div key={idx} className="bg-white p-2 rounded shadow-sm border group hover:border-red-200 transition-colors animate-in slide-in-from-right-2">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <span className="font-bold text-slate-800 block text-sm">{item.productName}</span>
                                <span className="text-xs text-slate-500">${item.price.toLocaleString()}</span>
                            </div>
                            <button onClick={() => removeFromCart(idx)} className="text-gray-300 hover:text-red-500 p-1 transition-colors"><Trash2 size={16} /></button>
                        </div>
                        <input className="text-[10px] border-b border-dashed w-full mt-1 p-0.5 focus:outline-none focus:border-slate-500 bg-transparent placeholder:text-gray-300 text-slate-600 italic" placeholder="Nota..." value={item.notes} onChange={(e) => updateItemNote(idx, e.target.value)}/>
                    </div>
                ))
            )}
        </div>

        <div className="p-3 bg-white border-t border-slate-200">
            <div className="flex justify-between font-bold text-xl mb-3 text-slate-900"><span>Total</span><span>${cart.reduce((acc, i) => acc + i.price, 0).toLocaleString()}</span></div>
            <Button onClick={sendOrder} disabled={cart.length === 0} className="w-full bg-green-600 hover:bg-green-700 h-12 text-base font-bold shadow-lg transition-all active:scale-95 rounded-xl">
                Enviar a Cocina <Send className="ml-2" size={16}/>
            </Button>
        </div>
      </div>
    </div>
  );
}