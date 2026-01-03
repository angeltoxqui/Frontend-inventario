export enum UserRole {
  ADMIN = 'admin',
  MESERO = 'mesero',
  COCINERO = 'cocinero',
  CAJERO = 'cajero'
}

export enum ProductCategory {
  BEBIDAS = 'bebidas',
  FUERTES = 'fuertes',
  ENTRADAS = 'entradas',
  POSTRES = 'postres'
}

// Estados de Mesa
export type TableStatus = 'libre' | 'cocinando' | 'servir' | 'comiendo' | 'pagando';

export interface Table {
  id: string;
  number: number;
  status: TableStatus; 
  waiterId?: string;
  timestamp?: number; // Hora de apertura (Vital para la alerta de 1 hora)
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  ingredients: string[]; 
  recipe?: RecipeItem[];
}

export interface UnitType {
    // Definimos esto como string union type o enum si prefieres
    // Para simplificar en este paso, usaremos string en Ingredient
}

export interface Ingredient {
  id: string;
  name: string;
  unit: 'kg' | 'lt' | 'und' | 'gr' | 'ml';
  cost: number;
  currentStock: number;
  maxStock: number;
}

export interface RecipeItem {
  ingredientId: string;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  notes?: string;
  assignedTo?: string;
}

export interface ClientData {
  nit: string;
  name: string;
  email: string;
  phone: string;
}

export interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  status: 'pendiente' | 'listo' | 'entregado' | 'por_cobrar'; 
  timestamp: number;
  total: number;
  tip?: number;
  discount?: number;
  paymentMethod?: 'efectivo' | 'tarjeta' | 'nequi';
  clientData?: ClientData;
  isSplit?: boolean;
  paidItems?: OrderItem[];
}

export interface User {
  id: string;
  fullName: string;
  role: UserRole;
  en_turno: boolean;
  qrCode?: string;
}

// --- NUEVO: GASTOS Y TRANSACCIONES ---

export interface Expense {
  id: string;
  timestamp: number;
  concept: string; // Ej: "Compra Carne"
  amount: number;
  category: 'insumos' | 'servicios' | 'nomina' | 'otros';
  registeredBy: string;
  relatedProductId?: string; // Si fue compra de stock, qué producto fue
}

// Registro Unificado para el Historial
export interface TransactionRecord {
  id: string;
  type: 'venta' | 'gasto';
  timestamp: number;
  description: string; // "Mesa 1" o "Compra Tomate"
  amount: number; // Positivo (Venta) o Negativo (Gasto)
  user: string;
}

// Para Reportes
export interface SaleRecord {
  id: string;
  timestamp: number;
  total: number;
  method: string;
  waiterName: string;
  tableNumber: number;
  itemsCount: number;
  cost: number;
  discount: number;
}