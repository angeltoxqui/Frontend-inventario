/**
 * Types para Table Management Edge Function
 */

/**
 * Acciones disponibles para table-management
 */
export type TableAction = "list" | "create" | "update" | "update_status";

/**
 * Payload base para todas las acciones de table
 */
export interface TableActionPayload {
    action: TableAction;
    tenant_id: number;
}

/**
 * Payload para listar mesas
 */
export interface ListTablesPayload extends TableActionPayload {
    action: "list";
}

/**
 * Payload para crear mesa
 */
export interface CreateTablePayload extends TableActionPayload {
    action: "create";
    nombre: string;
    notas?: string;
}

/**
 * Payload para actualizar mesa
 */
export interface UpdateTablePayload extends TableActionPayload {
    action: "update";
    mesa_id: number;
    nombre?: string;
    notas?: string;
}

/**
 * Payload para cambiar estado de mesa
 */
export interface UpdateTableStatusPayload extends TableActionPayload {
    action: "update_status";
    mesa_id: number;
    ocupada: boolean;
}

/**
 * Union type de todos los payloads de table posibles
 */
export type TableManagementPayload =
    | ListTablesPayload
    | CreateTablePayload
    | UpdateTablePayload
    | UpdateTableStatusPayload;

/**
 * Resultado de operaciones de table
 */
export interface TableOperationResult {
    success: boolean;
    action: TableAction;
    tenant_id: number;
    mesa_id?: number;
    data?: unknown;
    error?: string;
    error_code?: string;
}
