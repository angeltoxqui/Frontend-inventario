import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react';
import { MockService } from '../../services/mockService';
import { Product, Table, OrderItem } from '../../types';
import { useToast } from '../../components/ui/Toast';
import { Search, Send, ArrowLeft, Users, Trash2 } from 'lucide-react'; 
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';

export const Route = createFileRoute('/_layout/pos')({
  component: POS,
})

function POS() {
  const [view, setView] = useState<'map' | 'order'>('map');
  const [tables, setTables] = useState<Table[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modales
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    const interval = setInterval(loadData, 3000); // Refresco rápido
    loadData();
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const t = await MockService.getTables();
    setTables(t);
    const p = await MockService.getProducts();
    setProducts(p);
  };

  const getTableColor = (status: string) => {
    switch (status) {
      case 'libre': return 'bg-green-500 border-green-600 text-white';
      case 'cocinando': return 'bg-red-500 border-red-600 text-white animate-pulse';
      case 'servir': return 'bg-orange-500 border-orange-600 text-white animate-bounce';
      case 'comiendo': return 'bg-blue-600 border-blue-700 text-white';
      case 'pagando': return 'bg-purple-600 border-purple-700 text-white';
      default: return 'bg-gray-300';
    }
  };

  const handleTableClick = (t: Table) => {
    setSelectedTable(t);
    if (t.status === 'libre') {
      setCart([]);
      setView('order');
    } else {
      setIsActionModalOpen(true);
    }
  };

  const addToCart = (p: Product) => {
    setCart(prev => {
      return [...prev, { 
          productId: p.id, 
          productName: p.name, 
          price: p.price, 
          quantity: 1, 
          assignedTo: 'Mesa', 
          notes: '' 
      }];
    });
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
    toast("Pedido enviado a Cocina 🔥", "success");
    setView('map');
    loadData();
  };

  const handleServe = async () => {
    if (selectedTable) {
      await MockService.serveTable(selectedTable.id);
      setIsActionModalOpen(false);
      loadData();
      toast("Mesa servida 🍽️", "success");
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
      loadData();
      toast("Cuenta enviada a Caja 📄", "success");
    }
  };

  const confirmSplit = async () => {
      if(!selectedTable) return;
      const dummyItems: OrderItem[] = [
          { productId: 'p-1', productName: 'Hamburguesa', price: 25000, quantity: 1, assignedTo: 'Juan' },
          { productId: 'p-2', productName: 'Coca Cola', price: 5000, quantity: 1, assignedTo: 'Juan' },
          { productId: 'p-1', productName: 'Hamburguesa', price: 25000, quantity: 1, assignedTo: 'Maria' },
      ];

      await MockService.requestBill(selectedTable.id, { isSplit: true, items: dummyItems });
      setIsSplitModalOpen(false);
      loadData();
      toast("Cuenta dividida enviada a Caja 👥", "success");
  }

  // --- VISTA MAPA ---
  if (view === 'map') {
    return (
      <div className="p-6 h-screen bg-slate-100 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800">Sala Principal</h1>
            <div className="flex gap-2 text-xs font-bold">
                <span className="px-2 py-1 bg-green-500 text-white rounded">Libre</span>
                <span className="px-2 py-1 bg-red-500 text-white rounded">Cocina</span>
                <span className="px-2 py-1 bg-orange-500 text-white rounded">Servir</span>
                <span className="px-2 py-1 bg-blue-600 text-white rounded">Comiendo</span>
                <span className="px-2 py-1 bg-purple-600 text-white rounded">Pagando</span>
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {tables.map(t => (
            <button
              key={t.id}
              onClick={() => handleTableClick(t)}
              className={`aspect-square rounded-full flex flex-col items-center justify-center shadow-lg border-4 transition-transform hover:scale-105 ${getTableColor(t.status)}`}
            >
              <span className="text-4xl font-black">{t.number}</span>
              <span className="text-sm font-bold uppercase mt-1 opacity-90">{t.status}</span>
            </button>
          ))}
        </div>

        {/* MODAL ACCIONES MESA */}
        <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Acciones Mesa {selectedTable?.number}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="bg-gray-50 p-3 rounded text-sm text-center text-gray-500">
                  Estado actual: <span className="font-bold uppercase text-slate-800">{selectedTable?.status}</span>
              </div>
              
              {selectedTable?.status === 'servir' && (
                <Button onClick={handleServe} className="bg-orange-500 hover:bg-orange-600 h-14 text-lg">
                  🍽️ Servir Todo a la Mesa
                </Button>
              )}
              
              {(selectedTable?.status === 'comiendo' || selectedTable?.status === 'servir') && (
                <div className="grid grid-cols-2 gap-4">
                  <Button onClick={() => handleRequestBill(false)} className="bg-slate-900 h-14">
                    💰 Cuenta Única
                  </Button>
                  <Button onClick={() => handleRequestBill(true)} className="bg-blue-600 hover:bg-blue-700 h-14">
                    👥 Cuenta Separada
                  </Button>
                </div>
              )}

              {selectedTable?.status === 'cocinando' && (
                  <p className="text-center italic text-gray-400">Esperando que cocina termine...</p>
              )}
               {selectedTable?.status === 'pagando' && (
                  <p className="text-center italic text-purple-600 font-bold">Esperando pago en caja...</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
        
        {/* MODAL SIMULADO DIVISIÓN */}
        <Dialog open={isSplitModalOpen} onOpenChange={setIsSplitModalOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Dividir Cuenta (Demo)</DialogTitle></DialogHeader>
                <div className="py-4 text-center space-y-4">
                    <Users size={48} className="mx-auto text-blue-500"/>
                    <p>En esta demo, simularemos que la mesa dividió la cuenta entre <b>Juan</b> y <b>Maria</b>.</p>
                    <p className="text-sm text-gray-500">Al confirmar, el cajero verá los nombres separados.</p>
                </div>
                <DialogFooter>
                    <Button onClick={confirmSplit}>Enviar a Caja</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- VISTA PEDIDO ---
  return (
    <div className="h-screen flex flex-col md:flex-row bg-white">
      {/* Columna Productos */}
      <div className="flex-1 p-4 overflow-y-auto border-r">
        <div className="mb-4 flex gap-2 sticky top-0 bg-white z-10 py-2">
            <Button variant="outline" onClick={() => setView('map')}><ArrowLeft size={16}/> Volver</Button>
            <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 text-gray-400" size={18}/>
                <input 
                    className="w-full pl-8 p-2 border rounded bg-gray-50" 
                    placeholder="Buscar producto (ej: Hamburguesa)..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {products
                .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(p => (
                <div key={p.id} onClick={() => addToCart(p)} className="border p-4 rounded-xl hover:bg-slate-50 cursor-pointer shadow-sm transition-all active:scale-95">
                    <div className="flex justify-between items-start">
                        <p className="font-bold text-slate-800">{p.name}</p>
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">${p.price/1000}k</span>
                    </div>
                    {/* AQUÍ ESTABA EL ERROR: AGREGAMOS '?' PARA QUE NO FALLE SI NO HAY INGREDIENTES */}
                    {p.ingredients?.length > 0 && (
                        <details className="text-xs mt-2 text-gray-500" onClick={e => e.stopPropagation()}>
                            <summary className="cursor-pointer hover:text-slate-800 list-none">Ver ingredientes ▾</summary>
                            <p className="pl-2 mt-1 border-l-2 italic">{p.ingredients.join(', ')}</p>
                        </details>
                    )}
                </div>
            ))}
        </div>
      </div>

      {/* Columna Carrito */}
      <div className="w-full md:w-96 bg-slate-50 flex flex-col shadow-xl">
        <div className="p-4 bg-slate-900 text-white">
            <h2 className="font-bold text-lg">Mesa {selectedTable?.number}</h2>
            <p className="text-xs text-slate-400">Nueva Comanda</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
                <div className="text-center mt-10 opacity-50">
                    <p className="text-6xl mb-2">🛒</p>
                    <p>Carrito vacío</p>
                </div>
            ) : (
                cart.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded shadow-sm border group hover:border-red-200 transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="font-bold text-slate-800 block">{item.productName}</span>
                                <span className="text-sm text-slate-500">${item.price.toLocaleString()}</span>
                            </div>
                            
                            {/* BOTÓN ELIMINAR */}
                            <button 
                                onClick={() => removeFromCart(idx)}
                                className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                        
                        <input 
                            className="text-xs border-b border-dashed w-full mt-2 p-1 focus:outline-none focus:border-slate-500 bg-transparent" 
                            placeholder="✍️ Nota: Sin cebolla..."
                            value={item.notes}
                            onChange={(e) => updateItemNote(idx, e.target.value)}
                        />
                    </div>
                ))
            )}
        </div>

        <div className="p-4 bg-white border-t">
            <div className="flex justify-between font-bold text-xl mb-4">
                <span>Total</span>
                <span>${cart.reduce((acc, i) => acc + i.price, 0).toLocaleString()}</span>
            </div>
            <Button onClick={sendOrder} disabled={cart.length === 0} className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg font-bold">
                Enviar a Cocina <Send className="ml-2" size={18}/>
            </Button>
        </div>
      </div>
    </div>
  );
}