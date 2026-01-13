// src/services/mockService.ts

import { 
  Product, ProductCategory, User, UserRole, Table, Order, 
  Ingredient, SaleRecord, CashClosingLog, Expense, CashierSession, OrderItem, Store, SuperAdminUser, MigrationLog 
} from '../types';

const STORAGE_KEY = 'rootventory_db_v13_clean_start';

// --- DATA INICIAL ---
const defaultIngredients: Ingredient[] = [
  { id: 'i-1', name: 'Carne Molida', unit: 'gr', cost: 25, currentStock: 5000, maxStock: 10000, lastUpdated: Date.now() },
  { id: 'i-2', name: 'Pan Hamburguesa', unit: 'und', cost: 800, currentStock: 50, maxStock: 100, lastUpdated: Date.now() },
  { id: 'i-3', name: 'Papas Francesa', unit: 'gr', cost: 12, currentStock: 20000, maxStock: 50000, lastUpdated: Date.now() },
];

const defaultProducts: Product[] = [
  { id: 'p-1', name: 'Hamburguesa Sencilla', price: 20000, category: ProductCategory.FUERTES, recipe: [{ingredientId: 'i-1', quantity: 150}, {ingredientId: 'i-2', quantity: 1}], stock: 50, status: 'Activo' },
  { id: 'p-2', name: 'Coca Cola', price: 5000, category: ProductCategory.BEBIDAS, recipe: [], stock: 100, status: 'Activo' },
];

const defaultUsers: User[] = [
  { id: 'u-0', username: 'owner', pin: '0000', fullName: 'Super Admin', role: UserRole.SUPERADMIN, en_turno: true },
  { id: '1', username: 'admin', pin: '1234', fullName: 'Admin General', role: UserRole.ADMIN, en_turno: true, permissions: [] },
  { id: '2', username: 'juan', pin: '1111', fullName: 'Mesero Juan', role: UserRole.MESERO, en_turno: true, permissions: [] },
  { id: '3', username: 'maria', pin: '2222', fullName: 'Chef Maria', role: UserRole.COCINERO, en_turno: true, permissions: [] },
  { id: '4', username: 'pedro', pin: '3333', fullName: 'Cajero Pedro', role: UserRole.CAJERO, en_turno: true, permissions: [] },
];

const defaultTables: Table[] = Array.from({ length: 9 }, (_, i) => ({ id: `t-${i + 1}`, number: i + 1, status: 'libre' }));

const defaultStores: Store[] = [
    { tenant_id: 1, schema_name: 'tenant_000001', name: 'Restaurante Demo', adminName: 'Juan Perez', adminEmail: 'juan@demo.com', status: 'active', plan: 'basic', nextPayment: "2026-02-05T12:00:00Z", revenue: 0 },
    { tenant_id: 2, schema_name: 'tenant_000002', name: 'Pizza Italia', adminName: 'Luigi Mario', adminEmail: 'luigi@pizza.com', status: 'active', plan: 'pro', nextPayment: "2026-02-10T12:00:00Z", revenue: 1200000 },
    { tenant_id: 3, schema_name: 'tenant_000003', name: 'Tacos Pastor', adminName: 'Carlos R.', adminEmail: 'carlos@tacos.com', status: 'suspended', plan: 'basic', nextPayment: "2025-12-01T12:00:00Z", revenue: 0 },
];

const defaultSuperAdmins: SuperAdminUser[] = [
    { user_id: 'sa-1', email: 'dev@company.com', display: 'Dev Principal', role: 'dev', is_active: true, created_at: new Date().toISOString() }
];

const defaultMigrations: MigrationLog[] = [
    { id: 'm-1', migration_name: '2025_12_init_schema', applied_at: "2025-12-01T10:00:00Z", status: 'success', tenants_applied: 3 }
];

interface DatabaseSchema {
    ingredients: Ingredient[];
    products: Product[];
    users: User[];
    tables: Table[];
    orders: Order[];
    salesHistory: SaleRecord[];
    closingLogs: CashClosingLog[];
    expenses: Expense[];
    cashierSession: CashierSession | null;
    stores: Store[]; 
    superAdmins: SuperAdminUser[];
    migrations: MigrationLog[];
}

const createDefaultDb = (): DatabaseSchema => ({
    ingredients: defaultIngredients,
    products: defaultProducts,
    users: defaultUsers,
    tables: defaultTables,
    orders: [],
    salesHistory: [],
    closingLogs: [],
    expenses: [],
    cashierSession: null,
    stores: defaultStores,
    superAdmins: defaultSuperAdmins,
    migrations: defaultMigrations
});

const getDb = (): DatabaseSchema => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return createDefaultDb();
    try {
        return JSON.parse(stored);
    } catch (error) {
        console.error("CRITICAL: LocalStorage corrupted.", error);
        return createDefaultDb(); 
    }
};

const saveDb = (db: DatabaseSchema) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    window.dispatchEvent(new Event('storage')); 
};

export const MockService = {
  // Getters
  getIngredients: async () => getDb().ingredients,
  getProducts: async () => getDb().products,
  getOrders: async () => getDb().orders,
  getUsers: async () => getDb().users,
  getClosingLogs: async () => getDb().closingLogs,
  getBoxSession: async () => getDb().cashierSession,

  // --- OBTENER MESAS (CON AUTOCORRECCIÓN) ---
  getTables: async () => { 
      const db = getDb();
      
      // Limpiamos timestamps basura de mesas libres para evitar alertas falsas
      const sanitizedTables = db.tables.map(t => {
          // Si está libre, NO debe tener timestamp. Si lo tiene, es basura.
          if (t.status === 'libre' && t.timestamp) {
              return { ...t, timestamp: undefined };
          }
          return t;
      });

      // Si detectamos cambios, guardamos la versión limpia
      if (JSON.stringify(sanitizedTables) !== JSON.stringify(db.tables)) {
          db.tables = sanitizedTables;
          saveDb(db);
      }

      return db.tables;
  },

  // --- NUEVO: FUNCIÓN PARA RESETEAR SALA (FIX) ---
  resetAllTables: async () => {
      const db = getDb();
      db.tables = db.tables.map(t => ({
          ...t,
          status: 'libre',
          timestamp: undefined // Borrado total de tiempo
      }));
      // Opcional: Limpiar órdenes pendientes si se desea un reset total
      // db.orders = []; 
      saveDb(db);
      return true;
  },

  // CRUD Básicos
  createIngredient: async (i: Omit<Ingredient, 'id' | 'lastUpdated'>) => { const db = getDb(); const newIng = { ...i, id: Math.random().toString(36).substr(2,9), lastUpdated: Date.now() }; db.ingredients.push(newIng as any); saveDb(db); return newIng; },
  updateIngredient: async (id: string, d: Partial<Ingredient>) => { const db = getDb(); db.ingredients = db.ingredients.map(x => x.id === id ? { ...x, ...d, lastUpdated: Date.now() } : x); saveDb(db); return true; },
  deleteIngredient: async (id: string) => { const db = getDb(); db.ingredients = db.ingredients.filter(x => x.id !== id); saveDb(db); return true; },

  createProduct: async (p: Omit<Product, 'id'>) => { const db = getDb(); const newP = { ...p, id: `p-${Date.now()}`, recipe: p.recipe || [] }; db.products.push(newP); saveDb(db); return newP; },
  updateProduct: async (id: string, d: Partial<Product>) => { const db = getDb(); db.products = db.products.map(x => x.id === id ? {...x, ...d} : x); saveDb(db); return true; },
  deleteProduct: async (id: string) => { const db = getDb(); db.products = db.products.filter(x => x.id !== id); saveDb(db); return true; },

  updateUserStatus: async (id: string, s: boolean) => { const db = getDb(); db.users = db.users.map(u => u.id === id ? {...u, en_turno: s} : u); saveDb(db); return true; },
  updateUser: async (id: string, data: Partial<User>) => { const db = getDb(); db.users = db.users.map(u => u.id === id ? { ...u, ...data } : u); saveDb(db); return true; },

  // --- COCINA Y ORDENES ---
  createOrder: async (order: Order) => { 
      const db = getDb(); 
      db.orders.push(order); 
      db.tables = db.tables.map(t => t.id === order.tableId ? { ...t, status: 'cocinando', timestamp: Date.now() } : t); 
      saveDb(db); 
      return order; 
  },

  updateOrderStatus: async (id: string, status: string) => { 
      const db = getDb(); 
      const order = db.orders.find(o => o.id === id);
      
      if(order) { 
          order.status = status as any; 
          
          if(status === 'cocinando') {
              db.tables = db.tables.map(t => t.id === order.tableId ? { ...t, status: 'cocinando' } : t);
          }
          if(status === 'servir') {
              db.tables = db.tables.map(t => t.id === order.tableId ? { ...t, status: 'servir' } : t);
          }
          if(status === 'entregado' || status === 'comiendo') {
             db.tables = db.tables.map(t => t.id === order.tableId ? { ...t, status: 'comiendo' } : t);
          }

          saveDb(db); 
          return true; 
      } 
      return false; 
  },
  
  markOrderReady: async (id: string) => { const db = getDb(); const o = db.orders.find(x => x.id === id); if(o) { o.status = 'servir'; db.tables = db.tables.map(t => t.id === o.tableId ? { ...t, status: 'servir' } : t); saveDb(db); } return true; },
  serveTable: async (tid: string) => { const db = getDb(); const o = db.orders.find(x => x.tableId === tid && (x.status === 'servir' || x.status === 'listo')); if(o) { o.status = 'entregado'; db.tables = db.tables.map(t => t.id === tid ? { ...t, status: 'comiendo' } : t); saveDb(db); } return true; },
  
  requestBill: async (tid: string, split: { isSplit: boolean; items: OrderItem[] }) => { 
      const db = getDb(); 
      const orders = db.orders.filter(x => x.tableId === tid && x.status !== 'pagado' && x.status !== 'cancelado');
      
      if(orders.length > 0) { 
          orders.forEach(o => {
              o.status = 'pagando'; 
              o.isSplit = split?.isSplit; 
          });
          db.tables = db.tables.map(t => t.id === tid ? { ...t, status: 'pagando' } : t); 
          saveDb(db); 
          return true;
      } 
      return false; 
  },

  // --- [NUEVO] SUBIDA DE EVIDENCIA ---
  uploadEvidence: async (file: File): Promise<string> => {
      console.log(`[MockService] Iniciando subida simulada de: ${file.name} (${(file.size / 1024).toFixed(2)} KB)...`);
      
      // Simulamos latencia de red (1.5 segundos)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulamos que el backend nos devuelve una URL pública del bucket
      // En producción, aquí iría el fetch() real a tu API.
      const fakeUrl = `https://storage.googleapis.com/tu-restaurante-bucket/proofs/${Date.now()}_${file.name}`;
      console.log("[MockService] Subida completada. URL:", fakeUrl);
      
      return fakeUrl;
  },

  // --- [MODIFICADO] PAGO DE ORDEN (Acepta proofUrl) ---
  payOrder: async (orderId: string, amount: number, items: OrderItem[], method: string, proofUrl?: string) => {
      const db = getDb();
      const order = db.orders.find(o => o.id === orderId);
      
      if (order) {
          order.status = 'pagado'; 
          
          const pendingOrders = db.orders.filter(o => o.tableId === order.tableId && o.status !== 'pagado' && o.status !== 'cancelado');
          if (pendingOrders.length === 0) {
              db.tables = db.tables.map(t => t.id === order.tableId ? { ...t, status: 'libre', timestamp: undefined } : t);
          }
          
          // Creamos el registro de venta incluyendo la evidencia si existe
          const sale: any = { // Usamos 'any' temporalmente para agregar campos extras si SaleRecord es estricto
              id: `sale-${Date.now()}`, 
              orderId: order.id, 
              total: amount, 
              method: method, 
              timestamp: Date.now(), 
              items: items,
              proofUrl: proofUrl // Guardamos la URL de la evidencia para auditoría
          };

          if (!db.salesHistory) db.salesHistory = [];
          db.salesHistory.push(sale);
          saveDb(db);
          return true;
      }
      return false;
  },

  // --- CAJA Y OTROS ---
  openBox: async (base: number) => { const db = getDb(); db.cashierSession = { isOpen: true, base, startTime: Date.now() }; saveDb(db); return true; },
  registerClosing: async (log: Omit<CashClosingLog, 'id' | 'timestamp'>) => { const db = getDb(); db.closingLogs.push({ ...log, id: Math.random().toString(), timestamp: Date.now() }); db.cashierSession = null; saveDb(db); return true; },
  
  getSalesReport: async () => { const db = getDb(); return { history: db.salesHistory, summary: { totalRevenue: db.salesHistory.reduce((a,b)=>a+b.total,0) } }; },
  
  // --- CORRECCIÓN DASHBOARD: Datos reales del día ---
  getFinancialData: async () => { 
      const db = getDb(); 
      
      // 1. Obtenemos el rango de tiempo de HOY (00:00 a 23:59)
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

      // 2. Filtramos el historial de ventas (db.salesHistory)
      const todaySales = (db.salesHistory || []).filter(s => 
          s.timestamp >= startOfDay && s.timestamp < endOfDay
      );
      
      // 3. Sumamos el total de las ventas de hoy
      const totalIncome = todaySales.reduce((acc, curr) => acc + curr.total, 0);

      // 4. Retornamos la estructura que el Dashboard espera
      return { 
          totalIncome: totalIncome, 
          todaySales: todaySales, // Esto habilita el contador de pedidos
          totalExpenses: 0, 
          netProfit: totalIncome, 
          transactions: todaySales 
      }; 
  },

  getInventoryData: async () => { const db = getDb(); return { ingredients: [...db.ingredients], expenses: [...db.expenses], sales: [...db.salesHistory] }; },
  registerExpense: async (expense: Omit<Expense, 'id' | 'timestamp'>) => { const db = getDb(); db.expenses.push({ ...expense, id: Math.random().toString(), timestamp: Date.now() }); saveDb(db); return true; },

  // --- SUPERADMIN API ---
  getStores: async () => { await new Promise(r => setTimeout(r, 600)); return getDb().stores; },
  createStore: async (data: any) => { const db = getDb(); const newStore = { ...data, tenant_id: db.stores.length+1, status: 'active', revenue: 0, schema_name: `tenant_${db.stores.length+1}` }; db.stores.push(newStore); saveDb(db); return newStore; },
  toggleStoreStatus: async (id: number, s: any) => { const db = getDb(); const st = db.stores.find(x=>x.tenant_id===id); if(st){st.status=s; saveDb(db); return true;} return false; },
  deleteStore: async (id: number) => { const db = getDb(); db.stores = db.stores.filter(s=>s.tenant_id!==id); saveDb(db); return true; },
  getSuperAdmins: async () => { await new Promise(r=>setTimeout(r,400)); return getDb().superAdmins; },
  inviteSuperAdmin: async (d:any) => { const db=getDb(); const u={...d, user_id:`sa-${Date.now()}`, is_active:true, created_at: new Date().toISOString()}; db.superAdmins.push(u); saveDb(db); return u; },
  toggleSuperAdmin: async (uid:string, a:boolean) => { const db=getDb(); const u=db.superAdmins.find(x=>x.user_id===uid); if(u){u.is_active=a; saveDb(db); return true;} return false; },
  getMigrations: async () => getDb().migrations,
  applyMigration: async (n:string) => { const db=getDb(); db.migrations.push({id:`m-${Date.now()}`, migration_name:n, applied_at:new Date().toISOString(), status:'success', tenants_applied:db.stores.length}); saveDb(db); return true; },
  triggerMigration: async () => "job-ok",
  exportBackup: async () => "url-backup"
};