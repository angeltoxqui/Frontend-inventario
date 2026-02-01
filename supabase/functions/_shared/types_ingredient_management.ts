/**
 * Types para Ingredient Management Edge Function
 */

/**
 * Acciones disponibles para ingredient-management
 */
export type IngredientAction = "list" | "create" | "update" | "delete" | "adjust_stock";

/**
 * Payload base para todas las acciones de ingredient
 */
export interface IngredientActionPayload {
    action: IngredientAction;
    tenant_id: number;
}

/**
 * Payload para listar ingredientes
 */
export interface ListIngredientsPayload extends IngredientActionPayload {
    action: "list";
    limit?: number;
    offset?: number;
}

/**
 * Payload para crear ingrediente
 */
export interface CreateIngredientPayload extends IngredientActionPayload {
    action: "create";
    nombre: string;
    unidad_medida: string;
    costo?: number;
    stock_actual?: number;
    nota?: string;
}

/**
 * Payload para actualizar ingrediente
 */
export interface UpdateIngredientPayload extends IngredientActionPayload {
    action: "update";
    insumo_id: number;
    nombre?: string;
    unidad_medida?: string;
    costo?: number;
    nota?: string;
}

/**
 * Payload para eliminar ingrediente
 */
export interface DeleteIngredientPayload extends IngredientActionPayload {
    action: "delete";
    insumo_id: number;
}

/**
 * Payload para ajustar stock
 */
export interface AdjustStockPayload extends IngredientActionPayload {
    action: "adjust_stock";
    insumo_id: number;
    cantidad: number; // Positivo para agregar, negativo para restar
    motivo?: string;
}

/**
 * Union type de todos los payloads de ingredient posibles
 */
export type IngredientManagementPayload =
    | ListIngredientsPayload
    | CreateIngredientPayload
    | UpdateIngredientPayload
    | DeleteIngredientPayload
    | AdjustStockPayload;

/**
 * Resultado de operaciones de ingredient
 */
export interface IngredientOperationResult {
    success: boolean;
    action: IngredientAction;
    tenant_id: number;
    insumo_id?: number;
    data?: unknown;
    error?: string;
    error_code?: string;
}
