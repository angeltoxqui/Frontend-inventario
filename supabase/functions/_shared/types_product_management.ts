/**
 * Types para Product Management Edge Function
 */

/**
 * Acciones disponibles para product-management
 */
export type ProductAction = "list" | "create" | "update" | "delete";

/**
 * Payload base para todas las acciones de product
 */
export interface ProductActionPayload {
    action: ProductAction;
    tenant_id: number;
}

/**
 * Payload para listar productos
 */
export interface ListProductsPayload extends ProductActionPayload {
    action: "list";
    limit?: number;
    offset?: number;
}

/**
 * Payload para crear producto
 */
export interface CreateProductPayload extends ProductActionPayload {
    action: "create";
    nombre: string;
    precio: number;
    nota?: string;
    receta?: Array<{
        insumo_id: number;
        cantidad: number;
    }>;
}

/**
 * Payload para actualizar producto
 */
export interface UpdateProductPayload extends ProductActionPayload {
    action: "update";
    producto_id: number;
    nombre?: string;
    precio?: number;
    nota?: string;
    receta?: Array<{
        insumo_id: number;
        cantidad: number;
    }>;
}

/**
 * Payload para eliminar producto
 */
export interface DeleteProductPayload extends ProductActionPayload {
    action: "delete";
    producto_id: number;
}

/**
 * Union type de todos los payloads de product posibles
 */
export type ProductManagementPayload =
    | ListProductsPayload
    | CreateProductPayload
    | UpdateProductPayload
    | DeleteProductPayload;

/**
 * Resultado de operaciones de product
 */
export interface ProductOperationResult {
    success: boolean;
    action: ProductAction;
    tenant_id: number;
    producto_id?: number;
    data?: unknown;
    error?: string;
    error_code?: string;
}
