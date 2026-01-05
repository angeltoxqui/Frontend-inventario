export enum UserRole { ADMIN = 'admin', MESERO = 'mesero', COCINERO = 'cocinero', CAJERO = 'cajero' }
export enum ProductCategory { BEBIDAS = 'bebidas', FUERTES = 'fuertes', ENTRADAS = 'entradas', POSTRES = 'postres' }
export type TableStatus = 'libre' | 'cocinando' | 'servir' | 'comiendo' | 'pagando';

export interface Table { id: string; number: number; status: TableStatus; waiterId?: string; timestamp?: number; }
export interface Product { id: string; name: string; price: number; category: ProductCategory; ingredients: string[]; recipe?: RecipeItem[]; }

// CORRECCIÓN: Agregamos lastUpdated
export interface Ingredient { 
  id: string; 
  name: string; 
  unit: 'kg' | 'lt' | 'und' | 'gr' | 'ml'; 
  cost: number; 
  currentStock: number; 
  maxStock: number; 
  lastUpdated: number; // <-- Fecha de último movimiento o ingreso
}

export interface RecipeItem { ingredientId: string; quantity: number; }
export interface OrderItem { productId: string; productName: string; quantity: number; price: number; notes?: string; assignedTo?: string; }
export interface ClientData { nit: string; name: string; email: string; phone: string; }

export interface Order { 
  id: string; tableId: string; items: OrderItem[]; status: 'pendiente' | 'listo' | 'entregado' | 'por_cobrar'; 
  timestamp: number; total: number; tip?: number; discount?: number; paymentMethod?: 'efectivo' | 'tarjeta' | 'nequi'; 
  clientData?: ClientData; isSplit?: boolean; paidItems?: OrderItem[]; 
}

export interface User { id: string; fullName: string; role: UserRole; en_turno: boolean; qrCode?: string; }

export interface Expense { 
  id: string; timestamp: number; concept: string; amount: number; 
  category: 'insumos' | 'servicios' | 'nomina' | 'otros'; registeredBy: string; 
}

export interface SoldItemDetail { name: string; price: number; quantity: number; }

export interface SaleRecord {
  id: string; timestamp: number; total: number; method: string; waiterName: string; 
  tableNumber: number; itemsCount: number; cost: number; discount: number; 
  itemsSummary: SoldItemDetail[]; 
}

export interface CashClosingLog { 
  id: string; timestamp: number; user: string; systemExpected: number; realCounted: number; 
  difference: number; justification?: string; status: 'ok' | 'faltante' | 'sobrante'; openingBase: number; 
}

export interface CashierSession { isOpen: boolean; base: number; startTime: number; }