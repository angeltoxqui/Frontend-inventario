// Restoration of legacy types for MockService/SupabaseService
// Copied from previous models.ts content and extended with missing enums

export type UserRoleType = 'owner' | 'admin' | 'employee' | 'cocinero' | 'cajero';

export enum UserRole {
    SUPERADMIN = 'superadmin',
    ADMIN = 'admin',
    MESERO = 'mesero',
    COCINERO = 'cocinero',
    CAJERO = 'cajero'
}

export enum ProductCategory {
    FUERTES = 'fuertes',
    BEBIDAS = 'bebidas',
    ENTRADAS = 'entradas',
    POSTRES = 'postres'
}

export interface User {
    id: string; // Legacy used 'id', api.ts uses 'user_id'
    username: string;
    pin?: string;
    fullName?: string;
    role: UserRole | string;
    en_turno?: boolean;
    permissions?: string[];
    email?: string;
}

export interface Ingredient {
    id: string;
    name: string;
    unit: string;
    cost: number;
    currentStock: number;
    maxStock: number;
    lastUpdated: number;
}

export interface Product {
    id: string;
    name: string;
    price: number;
    category: ProductCategory | string;
    recipe: { ingredientId: string; quantity: number }[];
    stock: number;
    status: 'Activo' | 'Inactivo';
}

export type TableStatus = 'libre' | 'ocupada' | 'cocinando' | 'servir' | 'comiendo' | 'pagando';

export interface Table {
    id: string;
    number: number;
    status: TableStatus;
    timestamp?: number;
}

export interface OrderItem {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    notes?: string;
}

export interface Order {
    id: string;
    tableId: string;
    items: OrderItem[];
    status: 'pendiente' | 'cocinando' | 'servir' | 'entregado' | 'pagando' | 'pagado' | 'cancelado' | 'listo'; // Mixed legacy statuses
    timestamp: number;
    total: number;
    tip?: number;
    paymentMethod?: string;
    isSplit?: boolean;
}

export interface SaleRecord {
    id: string;
    orderId: string;
    total: number;
    method: string;
    timestamp: number;
    items: OrderItem[];
    proofUrl?: string;
}

export interface CashClosingLog {
    id: string;
    timestamp: number;
    totalSystem: number;
    totalReal: number;
    difference: number;
    notes?: string;
}

export interface Expense {
    id: string;
    timestamp: number;
    description: string;
    amount: number;
    category: string;
    authorizedBy: string;
}

export interface CashierSession {
    isOpen: boolean;
    base: number;
    startTime: number;
}

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
    status: 'success' | 'failed' | 'pending';
    tenants_applied: number;
}
