export interface User {
    user_id: string;
    email?: string;
    role?: string;
}

export interface AuthResponse {
    message: string;
    user_id: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterCredentials {
    email: string;
    password: string;
}

// Phase 2: Global Management
export interface Tenant {
    tenant_id: string;
    schema_name: string;
    name: string;
    plan: 'basic' | 'premium' | 'enterprise';
    status: 'active' | 'suspended';
    created_at: string;
    created_by?: string;
    admin_name?: string;
    admin_email?: string;
}

export interface CreateStoreDTO {
    tenant_id: string; // The backend seems to expect this, though often IDs are generated. Based on docs: header param? No, body.
    name: string;
    plan?: 'basic' | 'premium' | 'enterprise';
    owner_email: string;
    admin_name: string;
}

export interface TenantUser {
    user_id: string;
    tenant_id: string;
    email: string; // response has email, request has user_email
    role: 'owner' | 'admin' | 'employee';
    assigned_at?: string;
    assigned_by?: string;
    username?: string; // For internal pos users? No, this is for tenant-users global.
}

export interface CreateTenantUserDTO {
    user_email: string;
    role: 'owner' | 'admin' | 'employee';
}

// Phase 3: Restaurant Configuration

// --- Inventory ---
export interface Ingredient {
    id: number;
    nombre: string;
    unidad_medida: string;
    costo: number;
    stock_actual: number;
}

export interface CreateIngredientDTO {
    nombre: string;
    unidad_medida: string;
    costo: number;
    stock_actual: number;
}

export interface UpdateIngredientDTO {
    nombre?: string;
    costo?: number;
}

// --- Products ---

// The structure returned by the backend (Read)
export interface ProductIngredient {
    insumo_id: number;
    nombre: string;
    unidad_medida: string;
    cantidad_requerida: number;
}

export interface Product {
    id: number;
    nombre: string;
    precio: number;
    notas?: string;
    ingredientes: ProductIngredient[];
}

// The structure sent to the backend (Write)
export interface ProductIngredientDTO {
    insumo_id: number;
    cantidad_requerida: number;
}

export interface CreateProductDTO {
    nombre: string;
    precio: number;
    notas?: string;
    ingredientes: ProductIngredientDTO[];
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> { }

// --- Tables ---
export type TableVisualState =
    | 'libre'
    | 'en_preparacion'
    | 'listo_para_entregar'
    | 'entregada'
    | 'por_cobrar'
    | 'pagada'
    | 'cancelada';

export interface Table {
    id: number;
    nombre: string;
    ocupada: boolean;
    notas?: string;
    estado_visual: TableVisualState; // Calculated dynamically by backend
}

export interface CreateTableDTO {
    nombre: string;
    notas?: string;
}

// --- Orders (POS) ---

export type OrderState =
    | 'abierta'
    | 'en_preparacion'
    | 'listo_para_entregar'
    | 'entregada'
    | 'por_cobrar'
    | 'pagada'
    | 'cancelada';

export interface OrderItem {
    id: number;
    producto_id: number;
    producto_nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    notas?: string;
}

export interface Order {
    orden_id: number;
    mesa_id: number;
    estado: OrderState;
    total: number;
    items: OrderItem[];
}

export interface AddItemDTO {
    producto_id: number;
    cantidad: number;
    notas?: string;
}

// --- Kitchen ---

export interface KitchenOrderItem {
    producto: string;
    cantidad: number;
    notas?: string;
}

export interface KitchenOrder {
    orden_id: number;
    mesa_nombre: string;
    estado: OrderState;
    minutos_espera: number;
    items: KitchenOrderItem[];
}

// --- Billing ---

export interface PaymentDTO {
    propina?: number;
    metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
    factura_electronica: boolean;
    // Optional client fields (required if factura_electronica is true)
    cliente_doc?: string;
    cliente_nombre?: string;
    cliente_email?: string;
    cliente_tel?: string;
}

export interface InvoiceDTO extends PaymentDTO {
    factura_electronica: true;
    cliente_doc: string;
    cliente_nombre: string;
    cliente_email: string;
}

export interface OrderBillingDetails {
    id: number;
    mesa_id: number;
    estado: OrderState;
    total: number;
    propina: number;
    tipo_pago: string;
    items: {
        producto: string;
        cantidad: number;
        precio: number;
    }[];
}

// --- Reports ---

export interface DailyReport {
    total_dinero_ventas: number;
    total_propinas: number;
    total_caja: number;
    cantidad_mesas_atendidas: number;
}

export interface DashboardStats {
    ranking: {
        labels: string[];
        data: number[];
    };
    finanzas: {
        neto: number;
        propinas: number;
    };
}

export interface StockItem {
    nombre: string;
    stock: number;
    unidad: string;
    costo: number;
}

export interface Movement {
    fecha: string;
    producto: string;
    cantidad: number;
    tipo: string;
}
