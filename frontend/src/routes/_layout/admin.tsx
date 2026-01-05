import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react';
import { MockService } from '../../services/mockService';
import { User, Product, Table, Ingredient, ProductCategory, CashClosingLog } from '../../types';
import { 
  Users, Package, Grid3X3, Trash2, Plus, Edit, 
  UtensilsCrossed, Wallet, AlertTriangle, CheckCircle2, FileText, Lock,
  Calculator, Scale, Info, QrCode
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

export const Route = createFileRoute('/_layout/admin')({
  component: AdminPanel,
})

function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'finance' | 'inventory' | 'menu' | 'hr' | 'tables'>('finance');
  const { toast } = useToast();

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-slate-50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Panel Administrativo</h1>
          <p className="text-slate-500">Gestión integral del restaurante</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border overflow-x-auto max-w-full">
          {[
            { id: 'finance', icon: Wallet, label: 'Finanzas' },
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px]">
        {activeTab === 'finance' && <FinanceTab toast={toast} />}
        {activeTab === 'inventory' && <InventoryTab toast={toast} />}
        {activeTab === 'menu' && <MenuTab toast={toast} />}
        {activeTab === 'hr' && <HRTab toast={toast} />}
        {activeTab === 'tables' && <TablesTab toast={toast} />}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// 1. FINANZAS
// ------------------------------------------------------------------
const FinanceTab = ({ toast }: { toast: any }) => {
    const [closingLogs, setClosingLogs] = useState<CashClosingLog[]>([]);

    useEffect(() => {
        const load = async () => {
            const logs = await MockService.getClosingLogs();
            setClosingLogs(logs.sort((a,b) => b.timestamp - a.timestamp));
        };
        load();
    }, []);

    return (
        <div className="p-6 space-y-8">
            <div>
                <h3 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2">
                    <AlertTriangle className="text-orange-500"/> Auditoría de Cierres de Caja
                </h3>
                <div className="overflow-x-auto border rounded-xl shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 font-bold text-gray-500 border-b">
                            <tr>
                                <th className="p-4">Fecha/Hora</th>
                                <th className="p-4">Cajero</th>
                                <th className="p-4">Estado</th>
                                <th className="p-4 text-right bg-blue-50 text-blue-700">Base Inicial</th>
                                <th className="p-4 text-right">Sistema (Total)</th>
                                <th className="p-4 text-right">Real (Físico)</th>
                                <th className="p-4 text-right">Diferencia</th>
                                <th className="p-4">Justificación</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {closingLogs.length === 0 ? (
                                <tr><td colSpan={8} className="p-8 text-center text-gray-400">No hay cierres registrados aún.</td></tr>
                            ) : closingLogs.map(log => (
                                <tr key={log.id} className={`hover:bg-gray-50 ${log.status === 'faltante' ? 'bg-red-50 hover:bg-red-100' : ''}`}>
                                    <td className="p-4 text-gray-600">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="p-4 font-medium">{log.user}</td>
                                    <td className="p-4">
                                        {log.status === 'ok' && <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex items-center w-fit gap-1"><CheckCircle2 size={12}/> OK</span>}
                                        {log.status === 'faltante' && <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold flex items-center w-fit gap-1"><AlertTriangle size={12}/> FALTANTE</span>}
                                        {log.status === 'sobrante' && <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold flex items-center w-fit gap-1"><AlertTriangle size={12}/> SOBRANTE</span>}
                                    </td>
                                    <td className="p-4 text-right font-mono font-bold text-blue-600 bg-blue-50/50">
                                        <div className="flex items-center justify-end gap-1">
                                            <Lock size={12} className="opacity-50"/> ${log.openingBase?.toLocaleString() || '0'}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right font-mono">${log.systemExpected.toLocaleString()}</td>
                                    <td className="p-4 text-right font-mono font-bold">${log.realCounted.toLocaleString()}</td>
                                    <td className={`p-4 text-right font-mono font-bold ${log.difference < 0 ? 'text-red-600' : (log.difference > 0 ? 'text-yellow-600' : 'text-green-600')}`}>
                                        {log.difference > 0 ? '+' : ''}{log.difference.toLocaleString()}
                                    </td>
                                    <td className="p-4">
                                        {log.justification ? <div className="text-xs text-red-800 italic bg-white/50 p-2 rounded border border-red-100">"{log.justification}"</div> : <span className="text-gray-300">-</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ------------------------------------------------------------------
// 2. INVENTARIO (CON LÓGICA DE REGISTRO DE GASTOS AUTOMÁTICA)
// ------------------------------------------------------------------
const InventoryTab = ({ toast }: { toast: any }) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
      id: '', name: '', baseUnit: 'gr' as 'gr'|'ml'|'und', buyUnit: 'libra' as any,
      buyPrice: '', packageContent: '', currentStockBuyUnits: '', minStockBuyUnits: ''
  });

  useEffect(() => { loadIngredients(); }, []);

  const loadIngredients = async () => {
      const data = await MockService.getIngredients();
      setIngredients(data);
  }

  const getConversionFactor = () => {
      switch(formData.buyUnit) {
          case 'libra': return 500;
          case 'kilo': return 1000;
          case 'litro': return 1000;
          case 'unidad': return 1;
          case 'gramo': return 1;
          case 'paquete': return parseFloat(formData.packageContent) || 1;
          default: return 1;
      }
  };

  const calculateCostPerBaseUnit = () => {
      const price = parseFloat(formData.buyPrice) || 0;
      const factor = getConversionFactor();
      return factor === 0 ? 0 : price / factor;
  };

  const getStockLabel = () => {
      switch(formData.buyUnit) {
          case 'libra': return 'Libras'; case 'kilo': return 'Kilos'; case 'paquete': return 'Paquetes';
          case 'litro': return 'Litros'; case 'unidad': return 'Unidades'; case 'gramo': return 'Gramos / ML';
          default: return 'Cantidad';
      }
  }

  const handleSave = async () => {
    if (!formData.name || !formData.buyPrice) return toast("Faltan datos obligatorios", "error");
    
    const factor = getConversionFactor();
    const costPerBase = calculateCostPerBaseUnit();
    const stockInBase = (parseFloat(formData.currentStockBuyUnits) || 0) * factor;
    const minStockInBase = (parseFloat(formData.minStockBuyUnits) || 0) * factor;

    // --- LÓGICA DE GASTO AUTOMÁTICO ---
    // Buscamos si ya existía para saber si el stock aumentó
    const oldIngredient = ingredients.find(i => i.id === formData.id);
    const oldStock = oldIngredient ? oldIngredient.currentStock : 0;
    const stockDifference = stockInBase - oldStock;

    // Si aumentamos stock (o es nuevo y tiene stock inicial), registramos el gasto
    if (stockDifference > 0) {
        const purchaseCost = stockDifference * costPerBase;
        
        // Registramos en el historial de gastos
        await MockService.registerExpense({
            concept: `Compra Insumo: ${formData.name}`,
            amount: purchaseCost,
            category: 'insumos',
            registeredBy: 'Admin Inventario'
        });
    }

    const ingredientData: Ingredient = {
        id: formData.id || Math.random().toString(),
        name: formData.name,
        unit: formData.baseUnit,
        cost: costPerBase,
        currentStock: stockInBase,
        maxStock: minStockInBase,
        lastUpdated: Date.now()
    };

    try {
      if (formData.id) {
        await MockService.updateIngredient(ingredientData.id, ingredientData);
        toast(stockDifference > 0 ? "Actualizado y compra registrada 💰" : "Insumo actualizado", "success");
      } else {
        await MockService.createIngredient(ingredientData);
        toast("Creado y compra registrada 💰", "success");
      }
      setIsModalOpen(false);
      loadIngredients();
    } catch (e) { toast("Error al guardar", "error"); }
  };

  const openEdit = (ing: Ingredient) => {
      setFormData({
          id: ing.id, name: ing.name, baseUnit: ing.unit as any,
          buyUnit: ing.unit === 'und' ? 'unidad' : 'gramo', 
          buyPrice: ing.cost.toString(), packageContent: '1', 
          currentStockBuyUnits: ing.currentStock.toString(), minStockBuyUnits: ing.maxStock.toString()
      });
      setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    await MockService.deleteIngredient(id);
    toast("Eliminado", "success");
    loadIngredients();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Gestión de Insumos</h2>
        <button onClick={() => { setFormData({id:'', name:'', baseUnit:'gr', buyUnit:'libra', buyPrice:'', packageContent:'', currentStockBuyUnits:'', minStockBuyUnits:''}); setIsModalOpen(true); }} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 font-medium">
          <Plus size={18}/> Nuevo Insumo
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-semibold">
            <tr><th className="p-4">Insumo</th><th className="p-4">Costo Interno (Base)</th><th className="p-4">Stock Total (Base)</th><th className="p-4">Valor Bodega</th><th className="p-4 text-right">Acciones</th></tr>
          </thead>
          <tbody className="divide-y text-sm">
            {ingredients.map(ing => (
              <tr key={ing.id} className="hover:bg-gray-50 group">
                <td className="p-4 font-bold text-slate-700">{ing.name}</td>
                <td className="p-4 text-slate-600">${ing.cost.toFixed(1)} / {ing.unit}</td>
                <td className="p-4"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${ing.currentStock < ing.maxStock ? 'bg-red-500' : 'bg-green-500'}`}/><span className="font-mono font-medium">{ing.currentStock.toLocaleString()} {ing.unit}</span></div></td>
                <td className="p-4 font-mono text-slate-900">${(ing.currentStock * ing.cost).toLocaleString()}</td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => openEdit(ing)} className="text-blue-500 hover:bg-blue-50 p-2 rounded"><Edit size={16}/></button>
                  <button onClick={() => handleDelete(ing.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[550px] shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">{formData.id ? 'Editar (Modo Exacto)' : 'Agregar Insumo'} <Calculator size={18} className="text-blue-500"/></h3>
            {formData.id && <div className="mb-4 bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-200"><Info size={14} className="inline mr-1"/>Estás editando. Los valores se muestran en <b>Unidad Base</b> para mayor precisión.</div>}
            
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nombre</label><input className="w-full p-2 border rounded" placeholder="Ej: Pan" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} autoFocus/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Se mide en...</label><select className="w-full p-2 border rounded" value={formData.baseUnit} onChange={e => setFormData({...formData, baseUnit: e.target.value as any})}><option value="gr">Gramos</option><option value="ml">Mililitros</option><option value="und">Unidad</option></select></div>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4">
                  <div className="flex items-center gap-2 text-blue-800 font-bold text-sm border-b border-blue-200 pb-2"><Scale size={16}/> Compra</div>
                  <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-xs font-bold text-slate-500 block mb-1">¿Cómo lo compras?</label><select className="w-full p-2 border rounded bg-white" value={formData.buyUnit} onChange={e => setFormData({...formData, buyUnit: e.target.value as any})}><option value="libra">Por Libra</option><option value="kilo">Por Kilo</option><option value="litro">Por Litro</option><option value="paquete">Por Paquete</option><option value="unidad">Por Unidad</option><option value="gramo">Por Gramo (Manual)</option></select></div>
                      <div><label className="text-xs font-bold text-slate-500 block mb-1">Precio</label><input type="number" className="w-full p-2 border rounded" placeholder="Valor" value={formData.buyPrice} onChange={e => setFormData({...formData, buyPrice: e.target.value})} /></div>
                  </div>
                  {formData.buyUnit === 'paquete' && <div className="bg-white p-2 rounded border border-blue-200"><label className="text-xs font-bold text-blue-700 block mb-1">¿Cuánto trae? ({formData.baseUnit})</label><input type="number" className="w-full p-2 border border-blue-300 rounded" placeholder="Ej: 500" value={formData.packageContent} onChange={e => setFormData({...formData, packageContent: e.target.value})} /></div>}
                  <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-blue-200 shadow-sm"><span className="text-xs text-slate-500 font-medium">Costo Calculado:</span><span className="font-bold text-blue-700 text-lg">${calculateCostPerBaseUnit().toFixed(2)} <span className="text-xs text-slate-400 font-normal">/ {formData.baseUnit}</span></span></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-slate-500 block mb-1">Existencia ({getStockLabel()})</label><input type="number" className="w-full p-2 border rounded font-bold" placeholder="Cantidad física" value={formData.currentStockBuyUnits} onChange={e => setFormData({...formData, currentStockBuyUnits: e.target.value})} /><p className="text-[10px] text-slate-400 mt-1">Total: <b>{((parseFloat(formData.currentStockBuyUnits)||0) * getConversionFactor()).toLocaleString()} {formData.baseUnit}</b></p></div>
                  <div><label className="text-xs font-bold text-slate-500 block mb-1">Alerta Mínimo ({getStockLabel()})</label><input type="number" className="w-full p-2 border rounded" placeholder="Avisar si baja de..." value={formData.minStockBuyUnits} onChange={e => setFormData({...formData, minStockBuyUnits: e.target.value})} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
              <button onClick={handleSave} className="px-6 py-2 bg-slate-900 text-white rounded font-bold shadow-lg hover:bg-slate-800">{formData.id ? 'Guardar Cambios' : 'Crear Insumo'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------
// 3. MENÚ (RECETAS)
// ------------------------------------------------------------------
const MenuTab = ({ toast }: { toast: any }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<Partial<Product>>({ recipe: [] });
  const [tempIngredient, setTempIngredient] = useState({ id: '', qty: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
      const p = await MockService.getProducts();
      setProducts(p);
      const i = await MockService.getIngredients();
      setIngredients(i);
  }

  const addIngredientToRecipe = () => {
    if (!tempIngredient.id || tempIngredient.qty <= 0) return;
    const currentRecipe = editingProd.recipe || [];
    setEditingProd({ ...editingProd, recipe: [...currentRecipe, { ingredientId: tempIngredient.id, quantity: tempIngredient.qty }] });
    setTempIngredient({ id: '', qty: 0 });
  };

  const removeIngredientFromRecipe = (idx: number) => {
    const currentRecipe = editingProd.recipe || [];
    setEditingProd({ ...editingProd, recipe: currentRecipe.filter((_, i) => i !== idx) });
  };

  const handleSave = async () => {
    if (!editingProd.name || !editingProd.price) return;
    if (editingProd.id) { await MockService.updateProduct(editingProd.id, editingProd); } 
    else { await MockService.createProduct({ ...editingProd, id: Math.random().toString(), recipe: editingProd.recipe || [], stock: 100 } as Product); }
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
        <button onClick={() => { setEditingProd({ recipe: [] }); setIsModalOpen(true); }} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800"><Plus size={18}/> Nuevo Plato</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(p => (
          <div key={p.id} className="border rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{p.name}</h3>
                <span className={`text-xs px-2 py-1 rounded border uppercase font-bold ${getCategoryColor(p.category)}`}>{p.category}</span>
            </div>
            <p className="text-xl font-mono font-medium text-slate-700 mb-4">${p.price.toLocaleString()}</p>
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><UtensilsCrossed size={12}/> Receta (Costo)</p>
                {(!p.recipe || p.recipe.length === 0) ? <span className="text-xs text-gray-400 italic">Sin ingredientes</span> : (
                <ul className="text-xs space-y-1">
                    {p.recipe.map((r, i) => {
                    const ing = ingredients.find(ing => ing.id === r.ingredientId);
                    return <li key={i} className="flex justify-between text-gray-600"><span>{ing?.name}</span> <span>{r.quantity} {ing?.unit}</span></li>
                    })}
                </ul>
                )}
            </div>
            <div className="flex gap-2 justify-end"><button onClick={() => { setEditingProd(p); setIsModalOpen(true); }} className="text-sm border px-3 py-1 rounded hover:bg-gray-50">Editar</button></div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-10">
          <div className="bg-white p-6 rounded-xl w-[500px] shadow-2xl">
            <h3 className="text-lg font-bold mb-4">{editingProd.id ? 'Editar' : 'Crear'} Plato</h3>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <input className="w-full p-2 border rounded" placeholder="Nombre" value={editingProd.name || ''} onChange={e => setEditingProd({...editingProd, name: e.target.value})} />
                    <select className="w-full p-2 border rounded" value={editingProd.category || 'fuertes'} onChange={e => setEditingProd({...editingProd, category: e.target.value as any})}>
                        <option value="fuertes">Fuertes</option><option value="bebidas">Bebidas</option><option value="entradas">Entradas</option><option value="postres">Postres</option>
                    </select>
                </div>
                <input type="number" className="w-full p-2 border rounded" placeholder="Precio Venta" value={editingProd.price || ''} onChange={e => setEditingProd({...editingProd, price: parseFloat(e.target.value)})} />
                
                <div className="border-t pt-4">
                    <label className="text-sm font-bold block mb-2">Ingredientes de Receta</label>
                    <div className="flex gap-2 mb-2">
                        <select className="flex-1 p-2 border rounded text-sm" value={tempIngredient.id} onChange={e => setTempIngredient({...tempIngredient, id: e.target.value})}>
                            <option value="">Seleccionar Insumo...</option>{ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                        </select>
                        <input type="number" className="w-24 p-2 border rounded text-sm" placeholder="Cant. (gr/ml)" value={tempIngredient.qty || ''} onChange={e => setTempIngredient({...tempIngredient, qty: parseFloat(e.target.value)})}/>
                        <button onClick={addIngredientToRecipe} className="bg-slate-200 p-2 rounded"><Plus size={16}/></button>
                    </div>
                    <div className="bg-gray-50 p-2 rounded border max-h-32 overflow-y-auto">
                        {(editingProd.recipe || []).map((r, i) => {
                            const ing = ingredients.find(ing => ing.id === r.ingredientId);
                            const cost = ing ? (ing.cost * r.quantity) : 0;
                            return (
                                <div key={i} className="flex justify-between items-center text-sm p-1 border-b last:border-0">
                                    <span>{ing?.name}</span>
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <span className="font-bold">{r.quantity} {ing?.unit}</span>
                                        <span className="text-xs">(${cost.toFixed(0)})</span>
                                        <button onClick={() => removeIngredientFromRecipe(i)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500">Cancelar</button>
                <button onClick={handleSave} className="px-4 py-2 bg-slate-900 text-white rounded font-bold">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------
// 4. RRHH
// ------------------------------------------------------------------
const HRTab = ({ toast }: { toast: any }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [qrModal, setQrModal] = useState<User | null>(null);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
      const u = await MockService.getUsers();
      setUsers(u);
  }

  const handleToggleTurn = async (u: User) => {
    if (u.role === 'admin') return; 
    await MockService.updateUserStatus(u.id, !u.en_turno);
    loadUsers();
    toast(`Turno de ${u.fullName} ${!u.en_turno ? 'activado' : 'cerrado'}`, "info");
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-slate-800">Personal</h2><button className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={18}/> Registrar Empleado</button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => (
          <div key={u.id} className={`border p-4 rounded-xl flex flex-col gap-3 relative ${u.en_turno ? 'bg-white border-green-200' : 'bg-gray-50 border-gray-200'}`}>
             <div className="flex justify-between items-start">
                 <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${u.en_turno ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{u.fullName.charAt(0)}</div><div><h3 className="font-bold text-slate-800">{u.fullName}</h3><span className="text-xs uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold">{u.role}</span></div></div>
                 {u.role !== 'admin' && <button onClick={() => handleToggleTurn(u)} className={`w-12 h-6 rounded-full p-1 transition-colors ${u.en_turno ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${u.en_turno ? 'translate-x-6' : ''}`}/></button>}
             </div>
             <div className="flex gap-2 mt-2"><button onClick={() => setQrModal(u)} className="flex-1 border border-slate-200 rounded py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"><QrCode size={16}/> Credencial QR</button></div>
          </div>
        ))}
      </div>
      {qrModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl overflow-hidden max-w-sm w-full text-center">
                <div className="bg-slate-900 p-6 text-white"><h3 className="font-bold text-xl">Credencial</h3></div>
                <div className="p-8 flex flex-col items-center gap-4"><QrCode size={120}/><h2 className="text-2xl font-bold">{qrModal.fullName}</h2><button onClick={() => setQrModal(null)} className="text-gray-500">Cerrar</button></div>
            </div>
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------
// 5. SALA
// ------------------------------------------------------------------
const TablesTab = ({ toast }: { toast: any }) => {
  const [tables, setTables] = useState<Table[]>([]);
  
  useEffect(() => { 
      const i = setInterval(() => MockService.getTables().then(setTables), 2000); 
      MockService.getTables().then(setTables); 
      return () => clearInterval(i); 
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
            Monitor de Sala 
            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
        </h2>
        <button className="bg-slate-900 text-white px-3 py-1 rounded text-sm font-medium">+ Agregar Mesa</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {tables.map(t => (
            <div key={t.id} className={`
                aspect-square rounded-2xl flex flex-col items-center justify-center border-2 shadow-sm relative overflow-hidden transition-all
                ${t.status === 'libre' ? 'border-green-200 bg-white' : ''}
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
                <span className={`text-xs uppercase font-bold mb-2 px-2 py-0.5 rounded
                     ${t.status === 'libre' ? 'text-green-600 bg-green-100' : ''}
                     ${t.status === 'cocinando' ? 'text-red-600 bg-red-100' : ''}
                     ${t.status === 'servir' ? 'text-orange-600 bg-orange-100' : ''}
                     ${t.status === 'comiendo' ? 'text-blue-600 bg-blue-100' : ''}
                     ${t.status === 'pagando' ? 'text-purple-600 bg-purple-100' : ''}
                `}>{t.status}</span>
                {t.timestamp && <div className="bg-white/80 px-2 py-1 rounded shadow-sm text-slate-700 border border-slate-100"><Timer start={t.timestamp}/></div>}
            </div>
        ))}
      </div>
    </div>
  )
}