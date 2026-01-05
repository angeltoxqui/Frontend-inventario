import { 
  Product, ProductCategory, User, UserRole, Table, Order, 
  Ingredient, SaleRecord, CashClosingLog, Expense, CashierSession 
} from '../types';

// CAMBIAMOS LA VERSIÓN PARA LIMPIAR DATOS CORRUPTOS ANTERIORES
const STORAGE_KEY = 'rootventory_db_v8_fixed';

// --- DATA INICIAL ---
const defaultIngredients: Ingredient[] = [
  { id: 'i-1', name: 'Carne Molida', unit: 'gr', cost: 25, currentStock: 5000, maxStock: 10000, lastUpdated: Date.now() },
  { id: 'i-2', name: 'Pan Hamburguesa', unit: 'und', cost: 800, currentStock: 50, maxStock: 100, lastUpdated: Date.now() }, // 800 pesos por pan
  { id: 'i-3', name: 'Papas Francesa', unit: 'gr', cost: 12, currentStock: 20000, maxStock: 50000, lastUpdated: Date.now() },
];

const defaultProducts: Product[] = [
  { id: 'p-1', name: 'Hamburguesa Sencilla', price: 20000, category: ProductCategory.FUERTES, ingredients: [], recipe: [{ingredientId: 'i-1', quantity: 150}, {ingredientId: 'i-2', quantity: 1}] },
  { id: 'p-2', name: 'Coca Cola', price: 5000, category: ProductCategory.BEBIDAS, ingredients: [], recipe: [] },
];

const defaultUsers: User[] = [
  { id: '1', fullName: 'Admin General', role: UserRole.ADMIN, en_turno: true },
  { id: '2', fullName: 'Mesero Juan', role: UserRole.MESERO, en_turno: true },
  { id: '3', fullName: 'Chef Maria', role: UserRole.COCINERO, en_turno: true },
  { id: '4', fullName: 'Cajero Pedro', role: UserRole.CAJERO, en_turno: true },
];

const defaultTables: Table[] = Array.from({ length: 9 }, (_, i) => ({ id: `t-${i + 1}`, number: i + 1, status: 'libre' }));

// --- PERSISTENCIA ---
const loadData = () => { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : null; };
const saved = loadData();

let ingredients: Ingredient[] = saved?.ingredients || defaultIngredients;
let products: Product[] = saved?.products || defaultProducts;
let users: User[] = saved?.users || defaultUsers;
let tables: Table[] = saved?.tables || defaultTables;
let orders: Order[] = saved?.orders || [];
let salesHistory: SaleRecord[] = saved?.salesHistory || [];
let closingLogs: CashClosingLog[] = saved?.closingLogs || [];
let expenses: Expense[] = saved?.expenses || [];
let cashierSession: CashierSession | null = saved?.cashierSession || null;

const persistData = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        ingredients, products, users, tables, orders, salesHistory, closingLogs, expenses, cashierSession 
    }));
};

// --- SERVICIO ---
export const MockService = {
  getIngredients: async () => [...ingredients],
  getProducts: async () => [...products],
  getTables: async () => [...tables],
  getOrders: async () => [...orders],
  getUsers: async () => [...users],
  getClosingLogs: async () => [...closingLogs],
  getBoxSession: async () => cashierSession,
  
  // --- CORRECCIÓN EN INGREDIENTES ---
  createIngredient: async (i: any) => { 
      // Aseguramos que tenga fecha
      const newIng = { ...i, lastUpdated: Date.now() };
      ingredients.push(newIng); 
      persistData(); 
      return newIng; 
  },
  
  updateIngredient: async (id: string, d: any) => { 
      // Mapeamos y aseguramos que el ID coincida exactamente
      let found = false;
      ingredients = ingredients.map(x => {
          if (x.id === id) {
              found = true;
              return { ...x, ...d, lastUpdated: Date.now() }; // Sobrescribimos propiedades
          }
          return x;
      });
      
      if (found) {
          persistData(); 
          return true; 
      }
      return false; // Retornamos false si no se encontró (para debug)
  },
  
  deleteIngredient: async (id: string) => { ingredients = ingredients.filter(x => x.id !== id); persistData(); return true; },
  
  // ... (Resto de funciones igual que antes: Products, Users, Orders, etc.) ...
  createProduct: async (p: any) => { products.push(p); persistData(); return p; },
  updateProduct: async (id: string, d: any) => { products = products.map(x => x.id === id ? {...x, ...d} : x); persistData(); return true; },
  
  updateUserStatus: async (id: string, s: boolean) => { users = users.map(u => u.id === id ? {...u, en_turno: s} : u); persistData(); return true; },

  createOrder: async (order: Order) => {
    orders.push(order);
    tables = tables.map(t => t.id === order.tableId ? { ...t, status: 'cocinando', timestamp: Date.now() } : t);
    persistData();
    return order;
  },
  markOrderReady: async (id: string) => {
    const o = orders.find(x => x.id === id);
    if(o) { o.status = 'listo'; tables = tables.map(t => t.id === o.tableId ? { ...t, status: 'servir' } : t); persistData(); }
    return true;
  },
  serveTable: async (tid: string) => {
    const o = orders.find(x => x.tableId === tid && x.status === 'listo');
    if(o) { o.status = 'entregado'; tables = tables.map(t => t.id === tid ? { ...t, status: 'comiendo' } : t); persistData(); }
    return true;
  },
  requestBill: async (tid: string, split: any) => {
    const o = orders.find(x => x.tableId === tid);
    if(o) { o.status = 'por_cobrar'; o.isSplit = split?.isSplit; tables = tables.map(t => t.id === tid ? { ...t, status: 'pagando' } : t); persistData(); }
    return true;
  },
  
  payOrder: async (orderId: string, amount: number, items: any[], method: string) => {
    const order = orders.find(o => o.id === orderId);
    if(!order) return false;
    
    const itemsSummary = items.map((i: any) => ({ name: i.productName, price: i.price, quantity: i.quantity }));
    salesHistory.push({
        id: Math.random().toString(), timestamp: Date.now(), total: amount, method, 
        waiterName: 'Cajero Turno', tableNumber: 0, itemsCount: items.length, cost: amount * 0.4, discount: 0,
        itemsSummary: itemsSummary
    });

    // Descontar inventario
    items.forEach((soldItem: any) => {
        const prod = products.find(p => p.id === soldItem.productId);
        if (prod && prod.recipe) {
            prod.recipe.forEach(recipeItem => {
                const ingredient = ingredients.find(ing => ing.id === recipeItem.ingredientId);
                if (ingredient) {
                    ingredient.currentStock -= (recipeItem.quantity * soldItem.quantity);
                    if (ingredient.currentStock < 0) ingredient.currentStock = 0;
                }
            });
        }
    });

    if (!order.isSplit || (order.isSplit && order.items.length === items.length)) {
        tables = tables.map(t => t.id === order.tableId ? { ...t, status: 'libre', timestamp: undefined } : t);
        orders = orders.filter(o => o.id !== orderId);
    }
    persistData();
    return true;
  },

  openBox: async (base: number) => { cashierSession = { isOpen: true, base, startTime: Date.now() }; persistData(); return true; },
  registerClosing: async (log: Omit<CashClosingLog, 'id' | 'timestamp'>) => { closingLogs.push({ ...log, id: Math.random().toString(), timestamp: Date.now() }); cashierSession = null; persistData(); return true; },

  getSalesReport: async () => { return { history: salesHistory, summary: { totalRevenue: salesHistory.reduce((a,b)=>a+b.total,0) } }; },
  getFinancialData: async () => { 
      const totalIncome = salesHistory.reduce((sum, s) => sum + s.total, 0); 
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      return { totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses, transactions: [] }; 
  },
  getInventoryData: async () => { return { ingredients: [...ingredients], expenses: [...expenses], sales: [...salesHistory] }; },
  registerExpense: async (expense: any) => { expenses.push({ ...expense, id: Math.random().toString(), timestamp: Date.now() }); persistData(); return true; },
};