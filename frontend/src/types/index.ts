// src/types/index.ts

export enum UserRole {
  ADMIN = 'admin',
  MESERO = 'mesero',
  COCINERO = 'cocinero',
  CAJERO = 'cajero',
  SUPERADMIN = 'superadmin'
}

export enum ProductCategory { BEBIDAS = 'bebidas', FUERTES = 'fuertes', ENTRADAS = 'entradas', POSTRES = 'postres' }

export type TableStatus = 'libre' | 'cocinando' | 'servir' | 'comiendo' | 'pagando';

export interface Table { id: string; number: number; status: TableStatus; waiterId?: string; timestamp?: number; }

export interface Product {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  recipe?: RecipeItem[];
  stock?: number;
  status?: string;
  image?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: 'kg' | 'lt' | 'und' | 'gr' | 'ml';
  cost: number;
  currentStock: number;
  maxStock: number;
  lastUpdated: number;
}

export interface RecipeItem { ingredientId: string; quantity: number; }

export interface OrderItem { productId: string; productName: string; quantity: number; price: number; notes?: string; assignedTo?: string; }

export interface ClientData { nit: string; name: string; email: string; phone: string; }

export interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  // [MODIFICADO] Se agregó 'pagando' para sincronizar con la vista de Mesero
  // [MODIFICADO] Se agregó 'cocinando' y 'servir' para soportar el flujo real
  status: 'pendiente' | 'listo' | 'entregado' | 'por_cobrar' | 'pagado' | 'cancelado' | 'pagando' | 'cocinando' | 'servir' | 'abierta';
  timestamp: number;
  total: number;
  tip?: number;
  discount?: number;
  paymentMethod?: 'efectivo' | 'tarjeta' | 'nequi';
  clientData?: ClientData;
  isSplit?: boolean;
  paidItems?: OrderItem[];

  // --- NUEVOS CAMPOS PARA FACTURACIÓN ---
  invoiceStatus?: 'no_requerida' | 'pendiente' | 'emitida' | 'error';
  invoiceCufe?: string; // Código Único de Facturación
  invoiceUrl?: string;  // Link al QR o PDF
}

export interface User {
  id: string;
  fullName: string;
  username?: string;
  pin?: string;
  role: UserRole;
  en_turno: boolean;
  qrCode?: string;
  permissions?: string[];
}

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

export interface Store {
  tenant_id: number;
  schema_name: string;
  name: string;
  adminName: string;
  adminEmail: string;
  status: 'active' | 'suspended';
  plan: 'basic' | 'pro' | 'enterprise';
  nextPayment: string;
  revenue: number;
}

export interface SuperAdminUser {
  user_id: string;
  email: string;
  display: string;
  role: 'dev' | 'admin';
  is_active: boolean;
  created_at: string;
}

export interface MigrationLog {
  id: string;
  migration_name: string;
  applied_at: string;
  status: 'success' | 'failed';
  tenants_applied: number;
}