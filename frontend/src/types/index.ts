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

// Estados de Mesa (Ciclo de Vida)
// libre(Verde) -> cocinando(Rojo) -> servir(Naranja) -> comiendo(Azul) -> pagando(Morado)
export type TableStatus = 'libre' | 'cocinando' | 'servir' | 'comiendo' | 'pagando';

export interface Table {
  id: string;
  number: number;
  status: TableStatus;
  waiterId?: string;
  timestamp?: number; // Para medir tiempos de espera
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  ingredients: string[]; // Para mostrar en el acordeón del POS
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  notes?: string;      // "Sin cebolla"
  assignedTo?: string; // "Pedro" (Para cuentas separadas)
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
  
  // Datos Financieros y de Cobro
  tip?: number;
  discount?: number;
  paymentMethod?: 'efectivo' | 'tarjeta' | 'nequi';
  clientData?: ClientData; // Si pidió factura electrónica
  
  // Lógica de Cuentas Separadas
  isSplit?: boolean;
  paidItems?: OrderItem[]; // Historial de items ya pagados de esta orden
}

// Para Reportes e Historial
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