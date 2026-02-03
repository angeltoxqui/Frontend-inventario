import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { POSService } from '../../services/posService';
import { supabase } from '../../supabaseClient';
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
    queryFn: POSService.getTables, // Keeping this via Service/EdgeFunction for complex status logic potentially
    refetchInterval: 3000,
  });

  // [MODIFIED] Fetch products directly from Supabase
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      if (error) {
        toast("Error cargando productos", "error");
        throw error;
      }

      // Map snake_case to frontend camelCase if needed, or stick to Product type
      // Assuming Supabase structure matches frontend expects or we map it
      return data.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category_id || 'general', // Adjust based on schema
        // Add other fields mapping
      }));
    },
    staleTime: 1000 * 60,
  });

  // [MODIFIED] Fetch ingredients via POSService (from Python Backend)
  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: async () => {
      // Use POSService to get ingredients from the correct source (Python Backend)
      return await POSService.getIngredients();
    },
    staleTime: 1000 * 60,
  });

  // --- HELPERS & HANDLERS ---
  const getElapsedMinutes = (timestamp?: number) => {
    if (!timestamp) return 0;
    return Math.floor((Date.now() - timestamp) / 60000);
  };

  const getTableVisuals = (status: Table['status']) => {
    switch (status) {
      case 'libre': return {
        container: 'bg-card border-2 border-dashed border-border hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer shadow-sm',
        badge: 'bg-muted text-muted-foreground',
        icon: <Armchair size={16} className="text-muted-foreground" />,
        label: 'Libre',
        glow: ''
      };
      case 'cocinando': return {
        container: 'bg-orange-500/10 border-2 border-orange-500 shadow-lg shadow-orange-500/10',
        badge: 'bg-orange-600 text-white shadow-sm',
        icon: <ChefHat size={16} className="text-orange-600 dark:text-orange-400 animate-pulse" />,
        label: 'Cocina',
        glow: 'ring-2 ring-orange-500/20'
      };
      case 'comiendo': return {
        container: 'bg-blue-500/10 border-2 border-blue-500 shadow-md',
        badge: 'bg-blue-600 text-white',
        icon: <Utensils size={16} className="text-blue-600 dark:text-blue-400" />,
        label: 'Ocupado',
        glow: ''
      };
      case 'servir': return {
        container: 'bg-emerald-500/10 border-2 border-emerald-500 shadow-lg shadow-emerald-500/10 animate-bounce-subtle',
        badge: 'bg-emerald-600 text-white animate-pulse',
        icon: <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />,
        label: 'Listo',
        glow: 'ring-4 ring-emerald-500/10'
      };
      case 'pagando': return {
        container: 'bg-purple-500/10 border-2 border-purple-500 shadow-md',
        badge: 'bg-purple-600 text-white',
        icon: <Wallet size={16} className="text-purple-600 dark:text-purple-400" />,
        label: 'Pagando',
        glow: ''
      };
      default: return { container: 'bg-card', badge: '', icon: null, label: status, glow: '' };
    }
  };

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
    if (table.status !== 'libre') {
      setIsActionModalOpen(true);
    } else {
      // If free, just select and show menu immediately
      setView('order');
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    return products.filter((p: any) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const getProductIngredientsNames = (product: Product) => {
    if (!product.recipe) return [];
    return product.recipe.map(r => {
      const ing = ingredients.find((i: any) => i.id === r.ingredientId);
      return ing ? ing.name : '';
    }).filter(Boolean);
  };

  const addToCart = (product: Product) => {
    setCart(prev => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: 1,
        notes: '',
        assignedTo: 'Mesa'
      }
    ]);
    toast(`${product.name} agregado`, "info");
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemNote = (index: number, note: string) => {
    setCart(prev => {
      const n = [...prev];
      n[index].notes = note;
      return n;
    });
  };

  const toggleIngredients = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    setExpandedProductId(curr => curr === productId ? null : productId);
  };


  const sendOrder = async () => {
    if (!selectedTable) return;

    try {
      // [MODIFIED] Direct Supabase Insert
      const orderPayload = {
        table_id: selectedTable.id, // Assuming table.id matches database
        status: 'pending', // 'pendiente' -> 'pending'
        total: cart.reduce((acc, i) => acc + i.price, 0),
        created_at: new Date().toISOString()
      };

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select() // Select to get ID
        .single();

      if (orderError) throw orderError;

      if (orderData) {
        const itemsPayload = cart.map(item => ({
          order_id: orderData.id,
          product_id: item.productId, // Ensure mapping
          quantity: item.quantity,
          price: item.price,
          notes: item.notes
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsPayload);

        if (itemsError) throw itemsError;
      }

      await queryClient.invalidateQueries({ queryKey: ['tables'] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] }); // If we have an orders list

      setCart([]);
      setSelectedTable(null);
      localStorage.removeItem('pos_current_cart');
      localStorage.removeItem('pos_selected_table');

      toast("Pedido enviado a Cocina (Supabase)", "success");
      setView('map');

    } catch (error: any) {
      console.error("Error creating order:", error);
      toast(`Error al enviar: ${error.message || 'Error desconocido'}`, "error");
    }
  };

  const handleServe = async () => {
    if (selectedTable) {
      await POSService.serveTable(selectedTable.id);
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
      await POSService.requestBill(selectedTable.id, { isSplit: false, items: [] });
      setIsActionModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast("Cuenta enviada a Caja", "success");
    }
  };

  const confirmSplit = async () => {
    if (!selectedTable) return;
    const dummyItems: OrderItem[] = [
      { productId: 'p-1', productName: 'Hamburguesa', price: 25000, quantity: 1, assignedTo: 'Juan', notes: '' },
      { productId: 'p-2', productName: 'Coca Cola', price: 5000, quantity: 1, assignedTo: 'Juan', notes: '' },
      { productId: 'p-1', productName: 'Hamburguesa', price: 25000, quantity: 1, assignedTo: 'Maria', notes: '' },
    ];
    await POSService.requestBill(selectedTable.id, { isSplit: true, items: dummyItems });
    setIsSplitModalOpen(false);
    await queryClient.invalidateQueries({ queryKey: ['tables'] });
    toast("Cuenta dividida enviada a Caja", "success");
  }

  if (view === 'map') {
    if (loadingTables) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" size={40} /></div>;

    return (
      // [CORRECCIÓN] Fondo bg-muted/40
      <div className="p-6 h-screen bg-muted/40 overflow-y-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Sala Principal</h1>
            <p className="text-muted-foreground text-sm">Gestión de mesas</p>
          </div>

          {/* [CORRECCIÓN] Leyenda bg-card */}
          <div className="flex flex-wrap gap-2 text-[10px] font-semibold bg-card p-2 rounded-xl shadow-sm border border-border">
            <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-muted-foreground"><Armchair size={12} /> Libre</div>
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded border border-orange-500/20"><ChefHat size={12} /> Cocina</div>
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-500/20"><CheckCircle2 size={12} /> Listo</div>
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded border border-blue-500/20"><Utensils size={12} /> Ocupado</div>
            <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded border border-purple-500/20"><Wallet size={12} /> Pagando</div>
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
                      <Clock size={10} />
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

        {/* [CORRECCIÓN] Dialog bg-card */}
        <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
          <DialogContent className="sm:max-w-xs rounded-2xl bg-card border-border text-card-foreground">
            <DialogHeader><DialogTitle className="text-xl text-center font-bold">Mesa {selectedTable?.number}</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="bg-muted/50 p-3 rounded-xl text-center border border-border mb-1">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Estado</p>
                <span className="text-xl font-black uppercase text-foreground">
                  {tables.find(t => t.id === selectedTable?.id)?.status || selectedTable?.status}
                </span>
              </div>

              {(() => {
                const currentStatus = tables.find(t => t.id === selectedTable?.id)?.status;
                return (
                  <>
                    {currentStatus === 'servir' && (
                      <Button onClick={handleServe} className="bg-emerald-600 hover:bg-emerald-700 h-12 text-lg font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 text-white">
                        <CheckCircle2 className="mr-2" size={20} /> Servir Todo
                      </Button>
                    )}
                    {(currentStatus === 'comiendo' || currentStatus === 'servir') && (
                      <div className="flex flex-col gap-2 mt-1">
                        <Button onClick={() => handleRequestBill(false)} className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base shadow-xl transition-all active:scale-95">
                          <Receipt className="mr-2" size={18} /> Cuenta Única
                        </Button>
                        <Button onClick={() => handleRequestBill(true)} variant="outline" className="border-2 border-border text-muted-foreground hover:bg-muted hover:text-foreground h-10 font-bold transition-colors">
                          <Users className="mr-2" size={16} /> Cuenta Separada
                        </Button>
                      </div>
                    )}
                    {currentStatus === 'cocinando' && (
                      <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20 text-center">
                        <Loader2 className="animate-spin mx-auto text-yellow-600 dark:text-yellow-400 mb-2" size={24} />
                        <p className="font-bold text-yellow-800 dark:text-yellow-400 text-sm">Cocinando...</p>
                      </div>
                    )}
                    {currentStatus === 'pagando' && (
                      <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20 text-center">
                        <Receipt className="mx-auto text-purple-600 dark:text-purple-400 mb-2" size={24} />
                        <p className="font-bold text-purple-800 dark:text-purple-400 text-sm">Procesando Pago</p>
                      </div>
                    )}
                    {currentStatus === 'libre' && (
                      <Button onClick={() => { setIsActionModalOpen(false); setView('order'); }} className="bg-blue-600 hover:bg-blue-700 w-full text-white">
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
          <DialogContent className="bg-card text-card-foreground border-border">
            <DialogHeader><DialogTitle>Dividir Cuenta (Demo)</DialogTitle></DialogHeader>
            <div className="py-4 text-center space-y-4">
              <Users size={48} className="mx-auto text-blue-500" />
              <p>En esta demo, simularemos que la mesa dividió la cuenta entre <b>Juan</b> y <b>Maria</b>.</p>
            </div>
            <DialogFooter>
              <Button onClick={confirmSplit} className="w-full bg-primary text-primary-foreground">Enviar a Caja</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    // [CORRECCIÓN] Layout dividido con bg-background
    <div className="h-screen flex flex-col md:flex-row bg-background overflow-hidden">
      {/* PANEL IZQUIERDO: PRODUCTOS */}
      <div className="flex-1 p-3 overflow-y-auto border-r border-border custom-scrollbar">
        <div className="mb-3 flex gap-2 sticky top-0 bg-background z-10 py-1">
          <Button variant="outline" size="sm" onClick={() => setView('map')} className="border-border text-foreground"><ArrowLeft size={16} /> Volver</Button>
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 text-muted-foreground" size={14} />
            <input
              className="w-full pl-8 p-1.5 border border-input rounded bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all text-sm text-foreground placeholder:text-muted-foreground"
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
              // [CORRECCIÓN] Tarjeta producto bg-card
              <div key={p.id} onClick={() => addToCart(p)} className="border border-border p-3 rounded-lg hover:bg-accent cursor-pointer shadow-sm transition-all active:scale-95 group relative select-none bg-card">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-bold text-foreground text-sm leading-tight line-clamp-2">{p.name}</p>
                  <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-bold text-muted-foreground whitespace-nowrap">${(p.price / 1000).toFixed(0)}k</span>
                </div>
                {hasIngredients && (
                  <div className="mt-1">
                    <button onClick={(e) => toggleIngredients(e, p.id)} className="text-[10px] flex items-center gap-1 text-blue-500 font-medium hover:bg-blue-500/10 px-1 py-0.5 rounded -ml-1 transition-colors">
                      <Info size={12} /> {isExpanded ? 'Ocultar' : 'Info'}
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {isExpanded && (
                      <div className="mt-1 p-1 bg-blue-500/10 rounded border border-blue-500/20 animate-in slide-in-from-top-1 fade-in duration-200">
                        <div className="flex flex-wrap gap-1">
                          {ingredientNames.map((name, i) => <span key={i} className="text-[9px] bg-background border border-blue-200 dark:border-blue-800 text-muted-foreground px-1 py-0 rounded shadow-sm">{name}</span>)}
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
      {/* [CORRECCIÓN] Carrito con bg-muted/20 */}
      <div className="w-full md:w-80 lg:w-96 bg-muted/20 flex flex-col shadow-xl h-[40vh] md:h-auto border-t md:border-t-0 border-l border-border z-20">
        <div className="p-3 bg-primary text-primary-foreground flex justify-between items-center">
          <div>
            <h2 className="font-bold text-base">Mesa {selectedTable?.number}</h2>
            <p className="text-[10px] opacity-80">Nueva Comanda</p>
          </div>
          <div className="bg-primary-foreground/20 px-2 py-1 rounded text-xs font-mono">
            Items: {cart.length}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="text-center mt-10 opacity-50"><ShoppingCart size={32} className="mx-auto mb-2 text-muted-foreground" /><p className="text-muted-foreground text-sm font-medium">Carrito vacío</p></div>
          ) : (
            cart.map((item, idx) => (
              // [CORRECCIÓN] Item carrito bg-card
              <div key={idx} className="bg-card p-2 rounded shadow-sm border border-border group hover:border-red-500/50 transition-colors animate-in slide-in-from-right-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <span className="font-bold text-foreground block text-sm">{item.productName}</span>
                    <span className="text-xs text-muted-foreground">${item.price.toLocaleString()}</span>
                  </div>
                  <button onClick={() => removeFromCart(idx)} className="text-muted-foreground hover:text-red-500 p-1 transition-colors"><Trash2 size={16} /></button>
                </div>
                <input className="text-[10px] border-b border-dashed border-border w-full mt-1 p-0.5 focus:outline-none focus:border-primary bg-transparent placeholder:text-muted-foreground text-foreground italic" placeholder="Nota..." value={item.notes} onChange={(e) => updateItemNote(idx, e.target.value)} />
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-card border-t border-border">
          <div className="flex justify-between font-bold text-xl mb-3 text-foreground"><span>Total</span><span>${cart.reduce((acc, i) => acc + i.price, 0).toLocaleString()}</span></div>
          <Button onClick={sendOrder} disabled={cart.length === 0} className="w-full bg-green-600 hover:bg-green-700 h-12 text-base font-bold shadow-lg transition-all active:scale-95 rounded-xl text-white">
            Enviar a Cocina <Send className="ml-2" size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}