export type Role = 'owner' | 'admin' | 'employee' | 'cocinero' | 'cajero';
export type OrderStatus = 'abierta' | 'en_preparacion' | 'listo_para_entregar' | 'entregada' | 'por_cobrar' | 'pagada' | 'cancelada';

// --- Auth Interfaces ---
export interface User {
    user_id: string;
    email?: string;
    role: Role; // Made required to support RBAC
    username?: string; // Added for legacy support
    fullName?: string; // Added for Sidebar
    permissions?: string[]; // Added for Sidebar
    en_turno?: boolean; // Added for Sidebar
}

export interface LoginResponse {
    message: string;
    user_id: string;
}

// --- Tenant/Superadmin Interfaces ---
export interface Tenant {
    tenant_id: string;
    schema_name: string;
    name: string;
    plan: 'basic' | 'premium' | 'enterprise';
    status: 'active' | 'suspended';
    created_at: string;
    adminName?: string; // Added to match usages
    adminEmail?: string; // Added to match usages
    revenue?: number; // Added to match usages
}

export type Store = Tenant; // Alias for backward compatibility

export interface SuperAdminUser {
    user_id: string;
    email: string;
    display: string;
    role: 'dev' | 'admin';
    is_active: boolean;
    created_at: string;
}

export interface MigrationLog {
    id: number;
    migration_name: string;
    applied_at: string;
    status: 'success' | 'failed' | 'pending';
    tenants_applied: number;
}

export interface CreateStoreDTO {
    tenant_id?: string;
    name: string;
    plan?: 'basic' | 'premium' | 'enterprise';
    owner_email: string;
    admin_name: string;
}

// --- Inventory & Products ---
export interface Insumo {
    id: number;
    nombre: string;
    unidad_medida: string;
    costo: number;
    stock_actual: number;
}

export interface IngredientDTO {
    insumo_id: number;
    cantidad_requerida: number;
}

export interface Product {
    id: number;
    nombre: string;
    precio: number;
    notas?: string;
    ingredientes: Array<{
        insumo_id: number;
        nombre: string;
        cantidad_requerida: number;
        unidad_medida: string;
    }>;
}

export interface CreateProductDTO {
    nombre: string;
    precio: number;
    notas?: string;
    ingredientes: IngredientDTO[];
}

// --- POS & Orders ---
export interface Table {
    id: number;
    nombre: string;
    ocupada: boolean;
    notas?: string;
    estado_visual: 'libre' | 'en_preparacion' | 'listo_para_entregar' | 'por_cobrar' | 'ocupada';
}

export interface OrderItem {
    id?: number;
    producto_id?: number;
    producto: string; // En respuesta a veces es "producto_nombre" o "producto"
    cantidad: number;
    precio?: number;
    precio_unitario?: number;
    subtotal?: number;
    notas?: string;
}

export interface Order {
    orden_id: number;
    mesa_id?: number;
    mesa_nombre?: string;
    estado: OrderStatus;
    total?: number;
    items: OrderItem[];
    minutos_espera?: number;
}

// --- Billing ---
export interface PaymentDTO {
    propina: number;
    metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
    factura_electronica: boolean;
    cliente_doc?: string;
    cliente_nombre?: string;
    cliente_email?: string;
    cliente_tel?: string;
}
