import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react';
import { MockService } from '../../services/mockService';
import { User, Product, Table, Ingredient, ProductCategory, RecipeItem } from '../../types';
import { 
  Users, Package, Grid3X3, Trash2, Plus, Edit, 
  QrCode, FileDown, UtensilsCrossed, Clock
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

export const Route = createFileRoute('/_layout/admin')({
  component: AdminPanel,
})

function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'menu' | 'hr' | 'tables'>('inventory');
  const { toast } = useToast();

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-slate-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Panel Administrativo</h1>
          <p className="text-slate-500">Gestión integral del restaurante</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border overflow-x-auto max-w-full">
          {[
            { id: 'inventory', icon: Package, label: 'Inventario' },
            { id: 'menu', icon: UtensilsCrossed, label: 'Menú' },
            { id: 'hr', icon: Users, label: 'RRHH' },
            { id: 'tables', icon: Grid3X3, label: 'Sala' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap
                ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-gray-50'}
              `}
            >
              <tab.icon size={16}/> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px]">
        {activeTab === 'inventory' && <InventoryTab toast={toast} />}
        {activeTab === 'menu' && <MenuTab toast={toast} />}
        {activeTab === 'hr' && <HRTab toast={toast} />}
        {activeTab === 'tables' && <TablesTab toast={toast} />}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// A. GESTIÓN DE INVENTARIO (INSUMOS)
// ------------------------------------------------------------------
const InventoryTab = ({ toast }: { toast: any }) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Ingredient>>({});

  const loadData = async () => {
    const data = await MockService.getIngredients();
    setIngredients(data);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!editingItem.name || !editingItem.cost) return;
    try {
      if (editingItem.id) {
        await MockService.updateIngredient(editingItem.id, editingItem);
        toast("Insumo actualizado", "success");
      } else {
        await MockService.createIngredient({ 
            ...editingItem, 
            id: Math.random().toString(), 
            currentStock: editingItem.currentStock || 0 
        } as Ingredient);
        toast("Insumo creado", "success");
      }
      setIsModalOpen(false);
      loadData();
    } catch (e) { toast("Error al guardar", "error"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await MockService.deleteIngredient(id);
      toast("Insumo eliminado", "success");
      loadData();
    } catch (error: any) {
      toast(error.message, "error");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Insumos & Stock</h2>
        <button 
          onClick={() => { setEditingItem({}); setIsModalOpen(true); }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 font-medium"
        >
          <Plus size={18}/> Nuevo Insumo
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-semibold">
            <tr>
              <th className="p-4">Nombre</th>
              <th className="p-4">Unidad</th>
              <th className="p-4">Costo</th>
              <th className="p-4">Stock Actual</th>
              <th className="p-4">Stock Máx</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {ingredients.map(ing => (
              <tr key={ing.id} className="hover:bg-gray-50 group">
                <td className="p-4 font-medium text-slate-800">{ing.name}</td>
                <td className="p-4 uppercase text-slate-500">{ing.unit}</td>
                <td className="p-4 text-slate-600">${ing.cost}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${ing.currentStock < ing.maxStock * 0.2 ? 'bg-red-500' : 'bg-green-500'}`}/>
                    {ing.currentStock}
                  </div>
                </td>
                <td className="p-4 text-slate-400">{ing.maxStock}</td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => { setEditingItem(ing); setIsModalOpen(true); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded"><Edit size={16}/></button>
                  <button onClick={() => handleDelete(ing.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
            {ingredients.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400">No hay insumos registrados.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal Insumo */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-96 shadow-2xl">
            <h3 className="text-lg font-bold mb-4">{editingItem.id ? 'Editar' : 'Crear'} Insumo</h3>
            <div className="space-y-3">
              <input className="w-full p-2 border rounded" placeholder="Nombre" value={editingItem.name || ''} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
              <div className="flex gap-2">
                <input type="number" className="w-full p-2 border rounded" placeholder="Costo" value={editingItem.cost || ''} onChange={e => setEditingItem({...editingItem, cost: parseFloat(e.target.value)})} />
                <select className="p-2 border rounded" value={editingItem.unit || 'und'} onChange={e => setEditingItem({...editingItem, unit: e.target.value as any})}>
                  <option value="und">UND</option><option value="kg">KG</option><option value="gr">GR</option><option value="lt">LT</option><option value="ml">ML</option>
                </select>
              </div>
              <div className="flex gap-2">
                <input type="number" className="w-full p-2 border rounded" placeholder="Stock Actual" value={editingItem.currentStock || ''} onChange={e => setEditingItem({...editingItem, currentStock: parseFloat(e.target.value)})} />
                <input type="number" className="w-full p-2 border rounded" placeholder="Stock Máx" value={editingItem.maxStock || ''} onChange={e => setEditingItem({...editingItem, maxStock: parseFloat(e.target.value)})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 bg-slate-900 text-white rounded">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------
// B. GESTIÓN DEL MENÚ (PRODUCTOS + RECETAS)
// ------------------------------------------------------------------
const MenuTab = ({ toast }: { toast: any }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<Partial<Product>>({ recipe: [] });
  const [tempIngredient, setTempIngredient] = useState({ id: '', qty: 0 });

  const loadData = async () => {
    setProducts(await MockService.getProducts());
    setIngredients(await MockService.getIngredients());
  };

  useEffect(() => { loadData(); }, []);

  const addIngredientToRecipe = () => {
    if (!tempIngredient.id || tempIngredient.qty <= 0) return;
    const currentRecipe = editingProd.recipe || [];
    setEditingProd({
      ...editingProd,
      recipe: [...currentRecipe, { ingredientId: tempIngredient.id, quantity: tempIngredient.qty }]
    });
    setTempIngredient({ id: '', qty: 0 });
  };

  const removeIngredientFromRecipe = (idx: number) => {
    const currentRecipe = editingProd.recipe || [];
    setEditingProd({
      ...editingProd,
      recipe: currentRecipe.filter((_, i) => i !== idx)
    });
  };

  const handleSave = async () => {
    if (!editingProd.name || !editingProd.price) return;
    if (editingProd.id) {
      await MockService.updateProduct(editingProd.id, editingProd);
    } else {
      await MockService.createProduct({ 
          ...editingProd, 
          id: Math.random().toString(), 
          recipe: editingProd.recipe || [],
          ingredients: [], // Legacy
          stock: 100 // Default mock stock
      } as Product);
    }
    setIsModalOpen(false);
    loadData();
    toast("Menú actualizado", "success");
  };

  const getCategoryColor = (cat: ProductCategory) => {
    switch (cat) {
        case 'bebidas': return 'text-cyan-600 bg-cyan-50 border-cyan-200';
        case 'fuertes': return 'text-orange-600 bg-orange-50 border-orange-200';
        case 'entradas': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        case 'postres': return 'text-pink-600 bg-pink-50 border-pink-200';
        default: return 'text-gray-600 bg-gray-50';
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Carta & Recetas</h2>
        <button onClick={() => { setEditingProd({ recipe: [] }); setIsModalOpen(true); }} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800">
          <Plus size={18}/> Nuevo Plato
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(p => (
          <div key={p.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg">{p.name}</h3>
              <span className={`text-xs px-2 py-1 rounded border uppercase font-bold ${getCategoryColor(p.category)}`}>{p.category}</span>
            </div>
            <p className="text-xl font-mono font-medium text-slate-700 mb-4">${p.price.toLocaleString()}</p>
            
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><UtensilsCrossed size={12}/> Receta (Escandallo)</p>
              {(!p.recipe || p.recipe.length === 0) ? <span className="text-xs text-gray-400 italic">Sin ingredientes definidos</span> : (
                <ul className="text-xs space-y-1">
                  {p.recipe.map((r, i) => {
                    const ing = ingredients.find(ing => ing.id === r.ingredientId);
                    return <li key={i} className="flex justify-between text-gray-600"><span>{ing?.name || 'Insumo Eliminado'}</span> <span>{r.quantity} {ing?.unit}</span></li>
                  })}
                </ul>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => { setEditingProd(p); setIsModalOpen(true); }} className="text-sm border px-3 py-1 rounded hover:bg-gray-50">Editar</button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-10">
          <div className="bg-white p-6 rounded-xl w-[500px] shadow-2xl relative">
            <h3 className="text-lg font-bold mb-4">{editingProd.id ? 'Editar' : 'Crear'} Plato</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="text-xs font-bold text-gray-500">Nombre</label>
                      <input className="w-full p-2 border rounded" value={editingProd.name || ''} onChange={e => setEditingProd({...editingProd, name: e.target.value})} />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-gray-500">Categoría</label>
                      <select className="w-full p-2 border rounded" value={editingProd.category || 'fuertes'} onChange={e => setEditingProd({...editingProd, category: e.target.value as any})}>
                        <option value="fuertes">Fuertes</option>
                        <option value="bebidas">Bebidas</option>
                        <option value="entradas">Entradas</option>
                        <option value="postres">Postres</option>
                      </select>
                  </div>
              </div>
              <div>
                  <label className="text-xs font-bold text-gray-500">Precio Venta</label>
                  <input type="number" className="w-full p-2 border rounded" value={editingProd.price || ''} onChange={e => setEditingProd({...editingProd, price: parseFloat(e.target.value)})} />
              </div>

              {/* CONSTRUCTOR DE RECETAS */}
              <div className="border-t pt-4">
                <label className="text-sm font-bold block mb-2">Ingredientes de la Receta</label>
                <div className="flex gap-2 mb-2">
                    <select className="flex-1 p-2 border rounded text-sm" value={tempIngredient.id} onChange={e => setTempIngredient({...tempIngredient, id: e.target.value})}>
                        <option value="">Seleccionar Insumo...</option>
                        {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                    </select>
                    <input type="number" className="w-20 p-2 border rounded text-sm" placeholder="Cant." value={tempIngredient.qty || ''} onChange={e => setTempIngredient({...tempIngredient, qty: parseFloat(e.target.value)})}/>
                    <button onClick={addIngredientToRecipe} className="bg-slate-200 p-2 rounded hover:bg-slate-300"><Plus size={16}/></button>
                </div>
                <div className="bg-gray-50 p-2 rounded border max-h-32 overflow-y-auto">
                    {(editingProd.recipe || []).map((r, i) => {
                        const ing = ingredients.find(ing => ing.id === r.ingredientId);
                        return (
                            <div key={i} className="flex justify-between items-center text-sm p-1 border-b last:border-0">
                                <span>{ing?.name || 'N/A'}</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono bg-white px-1 rounded border">{r.quantity} {ing?.unit}</span>
                                    <button onClick={() => removeIngredientFromRecipe(i)} className="text-red-500"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        )
                    })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 border-t pt-4">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 bg-slate-900 text-white rounded font-bold">Guardar Plato</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------
// C. RECURSOS HUMANOS
// ------------------------------------------------------------------
const HRTab = ({ toast }: { toast: any }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [qrModal, setQrModal] = useState<User | null>(null);

  const loadData = async () => {
    setUsers(await MockService.getUsers());
  };

  useEffect(() => { loadData(); }, []);

  const handleToggleTurn = async (u: User) => {
    if (u.role === 'admin') return; 
    await MockService.updateUserStatus(u.id, !u.en_turno);
    loadData();
    toast(`Turno de ${u.fullName} ${!u.en_turno ? 'activado' : 'cerrado'}`, "info");
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Personal</h2>
        <button className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Plus size={18}/> Registrar Empleado
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => (
          <div key={u.id} className={`border p-4 rounded-xl flex flex-col gap-3 relative ${u.en_turno ? 'bg-white border-green-200' : 'bg-gray-50 border-gray-200'}`}>
             <div className="flex justify-between items-start">
                 <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${u.en_turno ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                         {u.fullName.charAt(0)}
                     </div>
                     <div>
                         <h3 className="font-bold text-slate-800">{u.fullName}</h3>
                         <span className="text-xs uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold">{u.role}</span>
                     </div>
                 </div>
                 {u.role !== 'admin' && (
                     <button 
                        onClick={() => handleToggleTurn(u)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${u.en_turno ? 'bg-green-500' : 'bg-gray-300'}`}
                     >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${u.en_turno ? 'translate-x-6' : ''}`}/>
                     </button>
                 )}
             </div>

             <div className="flex gap-2 mt-2">
                 <button onClick={() => setQrModal(u)} className="flex-1 border border-slate-200 rounded py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
                     <QrCode size={16}/> Credencial QR
                 </button>
             </div>
             
             {!u.en_turno && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] rounded-xl flex items-center justify-center pointer-events-none">
                 <span className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded shadow-lg transform -rotate-12">TURNO CERRADO</span>
             </div>}
          </div>
        ))}
      </div>

      {/* Modal QR */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl overflow-hidden max-w-sm w-full">
                <div className="bg-slate-900 p-6 text-center text-white">
                    <h3 className="font-bold text-xl">Credencial de Acceso</h3>
                    <p className="opacity-75 text-sm">Rootventory</p>
                </div>
                <div className="p-8 flex flex-col items-center gap-4">
                    <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center border-4 border-slate-900">
                        <QrCode size={120} className="text-slate-900"/>
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-slate-900">{qrModal.fullName}</h2>
                        <p className="text-slate-500 uppercase font-medium">{qrModal.role}</p>
                    </div>
                    <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-800">
                        <FileDown size={18}/> Descargar PDF
                    </button>
                    <button onClick={() => setQrModal(null)} className="text-sm text-gray-400 hover:text-gray-600">Cerrar</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------
// D. MONITOR DE SALA (MESAS)
// ------------------------------------------------------------------
const TablesTab = ({ toast }: { toast: any }) => {
  const [tables, setTables] = useState<Table[]>([]);

  const loadData = async () => {
    setTables(await MockService.getTables());
  };

  useEffect(() => {
    const interval = setInterval(loadData, 5000);
    loadData();
    return () => clearInterval(interval);
  }, []);

  const Timer = ({ start }: { start?: number }) => {
      const [elapsed, setElapsed] = useState('');
      useEffect(() => {
          if(!start) return;
          const i = setInterval(() => {
              const min = Math.floor((Date.now() - start)/60000);
              const h = Math.floor(min/60);
              const m = min % 60;
              setElapsed(`${h}h ${m}m`);
          }, 1000);
          return () => clearInterval(i);
      }, [start]);
      if(!start) return null;
      return <span className="flex items-center gap-1 font-mono text-xs"><Clock size={12}/> {elapsed}</span>
  }

  return (
    <div className="p-6">
       <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            Monitor de Sala <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
        </h2>
        <div className="flex gap-2">
            <button className="bg-slate-900 text-white px-3 py-1 rounded text-sm font-medium">+ Agregar Mesa</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {tables.map(t => (
            <div key={t.id} className={`
                aspect-square rounded-2xl flex flex-col items-center justify-center border-2 shadow-sm relative overflow-hidden
                ${t.status === 'libre' ? 'border-slate-200 bg-white' : ''}
                ${t.status === 'cocinando' ? 'border-red-200 bg-red-50' : ''}
                ${t.status === 'servir' ? 'border-orange-300 bg-orange-50' : ''}
                ${t.status === 'comiendo' ? 'border-blue-200 bg-blue-50' : ''}
                ${t.status === 'pagando' ? 'border-purple-200 bg-purple-50' : ''}
            `}> 
                <div className={`absolute top-0 w-full h-2 
                    ${t.status === 'libre' ? 'bg-green-500' : ''}
                    ${t.status === 'cocinando' ? 'bg-red-500 animate-pulse' : ''}
                    ${t.status === 'servir' ? 'bg-orange-500 animate-bounce' : ''}
                    ${t.status === 'comiendo' ? 'bg-blue-500' : ''}
                    ${t.status === 'pagando' ? 'bg-purple-500' : ''}
                `}/>

                <h3 className="text-3xl font-bold text-slate-800 mb-1">{t.number}</h3>
                <span className="text-xs uppercase font-bold text-slate-500 mb-2">{t.status}</span>
                {t.timestamp && <div className="bg-white/80 px-2 py-1 rounded shadow-sm text-slate-700"><Timer start={t.timestamp}/></div>}
            </div>
        ))}
      </div>
    </div>
  )
}