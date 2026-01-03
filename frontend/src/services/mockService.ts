import { 
  Product, ProductCategory, User, UserRole, Table, Order, 
  Ingredient, TableStatus, SaleRecord, UnitType, OrderItem 
} from '../types';

// --- 1. DATOS INICIALES (MOCK DATABASE) ---

// A. Inventario (Insumos)
let ingredients: Ingredient[] = [
  { id: 'i-1', name: 'Carne Molida', unit: 'gr', cost: 25, currentStock: 5000, maxStock: 10000 },
  { id: 'i-2', name: 'Pan Hamburguesa', unit: 'und', cost: 500, currentStock: 50, maxStock: 100 },
  { id: 'i-3', name: 'Leche Entera', unit: 'lt', cost: 3000, currentStock: 10, maxStock: 20 },
  { id: 'i-4', name: 'Queso Mozzarella', unit: 'gr', cost: 40, currentStock: 2000, maxStock: 5000 },
  { id: 'i-5', name: 'Tomate', unit: 'kg', cost: 4000, currentStock: 5, maxStock: 10 },
];

// B. Menú (Productos con Receta)
let products: Product[] = [
  { 
    id: 'p-1', name: 'Hamburguesa Clásica', price: 15000, category: ProductCategory.FUERTES, 
    stock: 100, ingredients: ['Carne', 'Pan'], 
    recipe: [
      { ingredientId: 'i-1', quantity: 150 }, // 150gr Carne
      { ingredientId: 'i-2', quantity: 1 }    // 1 Pan
    ] 
  },
  { 
    id: 'p-2', name: 'Coca Cola', price: 3500, category: ProductCategory.BEBIDAS, 
    stock: 50, ingredients: [],
    recipe: [] 
  },
  { 
    id: 'p-3', name: 'Cheesecake', price: 12000, category: ProductCategory.POSTRES, 
    stock: 20, ingredients: ['Queso', 'Leche'],
    recipe: [
      { ingredientId: 'i-3', quantity: 0.2 }, // 200ml Leche
      { ingredientId: 'i-4', quantity: 100 }  // 100gr Queso
    ] 
  },
  { 
    id: 'p-4', name: 'Limonada de Coco', price: 12000, category: ProductCategory.BEBIDAS, 
    stock: 30, ingredients: ['Limón', 'Coco'],
    recipe: [] 
  },
  { 
    id: 'p-5', name: 'Churrasco', price: 35000, category: ProductCategory.FUERTES, 
    stock: 15, ingredients: ['Carne', 'Papa'],
    recipe: [] 
  },
];

// C. Usuarios (RRHH)
let users: User[] = [
  { id: '1', fullName: 'Admin General', role: UserRole.ADMIN, en_turno: true },
  { id: '2', fullName: 'Juan Mesero', role: UserRole.MESERO, en_turno: true },
  { id: '3', fullName: 'Maria Chef', role: UserRole.COCINERO, en_turno: true },
  { id: '4', fullName: 'Pedro Cajero', role: UserRole.CAJERO, en_turno: true },
];

// D. Mesas (Sala)
let tables: Table[] = Array.from({ length: 9 }, (_, i) => ({
  id: `t-${i + 1}`,
  number: i + 1,
  status: 'libre'
}));

let orders: Order[] = [];
let salesHistory: SaleRecord[] = []; // Historial de ventas nuevas (sesión actual)

// --- 2. GENERADOR DE HISTORIAL SIMULADO (CRÍTICO PARA REPORTES) ---
// Esta función era la que faltaba, por eso no cargaban los gráficos
const generateMockHistory = (): SaleRecord[] => {
  const history: SaleRecord[] = [];
  const methods: ('efectivo'|'tarjeta'|'transferencia')[] = ['efectivo', 'tarjeta', 'transferencia'];
  const waiters = ['Juan Mesero', 'Pedro Cajero', 'Sofia Turno Tarde'];

  // Generar datos para los últimos 7 días
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Entre 5 y 15 ventas por día aleatorias
    const dailySalesCount = Math.floor(Math.random() * 10) + 5;

    for (let j = 0; j < dailySalesCount; j++) {
      const total = Math.floor(Math.random() * 50000) + 20000;
      const cost = Math.floor(total * (0.3 + Math.random() * 0.1)); 
      
      history.push({
        id: `sale-${i}-${j}`,
        timestamp: date.setHours(12 + j, Math.floor(Math.random() * 59)), 
        total: total,
        method: methods[Math.floor(Math.random() * methods.length)],
        waiterName: waiters[Math.floor(Math.random() * waiters.length)],
        tableNumber: Math.floor(Math.random() * 6) + 1,
        itemsCount: Math.floor(Math.random() * 5) + 1,
        cost: cost,
        discount: Math.random() > 0.8 ? total * 0.1 : 0 
      });
    }
  }
  return history;
};

// Generamos el historial una sola vez al cargar
const mockSalesHistory = generateMockHistory();

// --- 3. SERVICIO PRINCIPAL ---
export const MockService = {
  
  // --- A. INSUMOS ---
  getIngredients: async () => [...ingredients].sort((a, b) => a.name.localeCompare(b.name)),
  
  createIngredient: async (ing: Ingredient) => {
    ingredients.push(ing);
    return ing;
  },

  updateIngredient: async (id: string, data: Partial<Ingredient>) => {
    ingredients = ingredients.map(i => i.id === id ? { ...i, ...data } : i);
    return true;
  },

  deleteIngredient: async (id: string) => {
    const isUsed = products.some(p => p.recipe?.some(r => r.ingredientId === id));
    if (isUsed) {
      throw new Error("⛔ No se puede eliminar: Este insumo es parte de una receta activa.");
    }
    ingredients = ingredients.filter(i => i.id !== id);
    return true;
  },

  // --- B. PRODUCTOS ---
  getProducts: async () => [...products],
  
  createProduct: async (prod: Product) => {
    products.push(prod);
    return prod;
  },

  updateProduct: async (id: string, data: Partial<Product>) => {
    products = products.map(p => p.id === id ? { ...p, ...data } : p);
    return true;
  },

  deleteProduct: async (id: string) => {
    products = products.filter(p => p.id !== id);
    return true;
  },

  // --- C. USUARIOS ---
  getUsers: async () => [...users],
  
  updateUserStatus: async (id: string, status: boolean) => {
    users = users.map(u => u.id === id ? { ...u, en_turno: status } : u);
    return true;
  },
  
  createUser: async (user: User) => {
    users.push(user);
    return user;
  },

  // --- D. MESAS ---
  getTables: async () => [...tables],
  
  updateTableStatus: async (tableId: string, status: TableStatus, waiterId?: string) => {
    tables = tables.map(t => {
        if (t.id === tableId) {
            const isOpening = status !== 'libre' && t.status === 'libre';
            return {
                ...t,
                status,
                waiterId: status === 'libre' ? undefined : (waiterId || t.waiterId),
                timestamp: isOpening ? Date.now() : (status === 'libre' ? undefined : t.timestamp)
            };
        }
        return t;
    });
    return true;
  },

  // --- E. ORDENES Y FLUJO ---
  createOrder: async (order: Order) => {
    orders.push(order);
    tables = tables.map(t => t.id === order.tableId ? { ...t, status: 'cocinando', timestamp: Date.now() } : t);
    return order;
  },

  getOrders: async () => [...orders],

  markOrderReady: async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.status = 'listo';
      tables = tables.map(t => t.id === order.tableId ? { ...t, status: 'servir' } : t);
    }
    return true;
  },

  serveTable: async (tableId: string) => {
    const order = orders.find(o => o.tableId === tableId && o.status === 'listo');
    if (order) {
      order.status = 'entregado';
      tables = tables.map(t => t.id === tableId ? { ...t, status: 'comiendo' } : t);
    }
    return true;
  },

  requestBill: async (tableId: string, splitData?: { isSplit: boolean, items: OrderItem[] }) => {
    const order = orders.find(o => o.tableId === tableId && (o.status === 'entregado' || o.status === 'pendiente' || o.status === 'listo'));
    if (order) {
      order.status = 'por_cobrar';
      if (splitData?.isSplit) {
        order.isSplit = true;
        if (splitData.items.length > 0) order.items = splitData.items; 
      }
      tables = tables.map(t => t.id === tableId ? { ...t, status: 'pagando' } : t);
    }
    return true;
  },

  completeOrder: async (id: string) => {
    // Legacy support for simple kitchen flow
    const order = orders.find(o => o.id === id);
    if (order) {
        order.status = 'listo';
        tables = tables.map(t => t.id === order.tableId ? { ...t, status: 'servir' } : t);
    }
    return true;
  },

  payOrder: async (orderId: string, amountPaid: number, itemsPaid: OrderItem[], method: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return false;

    // Registrar en historial histórico (para reportes)
    mockSalesHistory.push({
        id: Math.random().toString(),
        timestamp: Date.now(),
        total: amountPaid,
        method: method,
        waiterName: 'Mesero Turno',
        tableNumber: parseInt(order.tableId.split('-')[1]),
        itemsCount: itemsPaid.length,
        cost: amountPaid * 0.4, 
        discount: order.discount || 0
    });

    if (order.isSplit) {
      order.paidItems = [...(order.paidItems || []), ...itemsPaid];
      order.items = order.items.filter(i => !itemsPaid.includes(i)); 
      if (order.items.length === 0) {
        tables = tables.map(t => t.id === order.tableId ? { ...t, status: 'libre', waiterId: undefined, timestamp: undefined } : t);
        order.status = 'entregado'; 
      }
    } else {
      tables = tables.map(t => t.id === order.tableId ? { ...t, status: 'libre', waiterId: undefined, timestamp: undefined } : t);
      orders = orders.filter(o => o.id !== orderId);
    }
    return true;
  },

  payTable: async (tableId: string) => {
      // Legacy support for quick pay
      orders = orders.filter(o => o.tableId !== tableId);
      tables = tables.map(t => t.id === tableId ? { ...t, status: 'libre', waiterId: undefined, timestamp: undefined } : t);
      return true;
  },

  // --- F. REPORTES ---
  getSalesReport: async () => {
    return new Promise<{ history: SaleRecord[], summary: any }>((resolve) => {
      setTimeout(() => {
        // Usamos mockSalesHistory que ya contiene datos generados + las ventas nuevas
        const today = new Date().toDateString();
        const todaySales = mockSalesHistory.filter(s => new Date(s.timestamp).toDateString() === today);
        
        const totalRevenue = mockSalesHistory.reduce((acc, curr) => acc + curr.total, 0);
        const totalCost = mockSalesHistory.reduce((acc, curr) => acc + curr.cost, 0);
        const totalDiscounts = mockSalesHistory.reduce((acc, curr) => acc + curr.discount, 0);

        resolve({
          history: mockSalesHistory,
          summary: {
            todaySales,
            totalRevenue,
            totalCost,
            totalDiscounts,
            netProfit: totalRevenue - totalCost - totalDiscounts
          }
        });
      }, 500); // Pequeña espera para simular carga
    });
  }
};