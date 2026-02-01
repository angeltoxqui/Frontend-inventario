/**
 * Types para Order Management Edge Function
 */

/**
 * Acciones disponibles para order-management
 */
export type OrderAction = "list" | "create" | "update_status" | "add_item" | "pay";

/**
 * Estados posibles de una orden
 */
export type OrderStatus = "abierta" | "cocinando" | "servir" | "comiendo" | "pagando" | "pagada" | "cancelada";

/**
 * Payload base para todas las acciones de order
 */
export interface OrderActionPayload {
    action: OrderAction;
    tenant_id: number;
}

/**
 * Payload para listar órdenes
 */
export interface ListOrdersPayload extends OrderActionPayload {
    action: "list";
    estado?: OrderStatus;
    mesa_id?: number;
    limit?: number;
    offset?: number;
}

/**
 * Payload para crear orden
 */
export interface CreateOrderPayload extends OrderActionPayload {
    action: "create";
    mesa_id: number;
    cliente_id?: number;
    items: Array<{
        producto_id: number;
        cantidad: number;
        nota?: string;
    }>;
}

/**
 * Payload para actualizar estado de orden
 */
export interface UpdateOrderStatusPayload extends OrderActionPayload {
    action: "update_status";
    orden_id: number;
    estado: OrderStatus;
}

/**
 * Payload para agregar item a orden existente
 */
export interface AddItemToOrderPayload extends OrderActionPayload {
    action: "add_item";
    orden_id: number;
    producto_id: number;
    cantidad: number;
    nota?: string;
}

/**
 * Payload para pagar orden
 */
export interface PayOrderPayload extends OrderActionPayload {
    action: "pay";
    orden_id: number;
    tipo_pago: "efectivo" | "tarjeta" | "nequi" | "otro";
    propina?: number;
    es_factura_electronica?: boolean;
}

/**
 * Union type de todos los payloads de order posibles
 */
export type OrderManagementPayload =
    | ListOrdersPayload
    | CreateOrderPayload
    | UpdateOrderStatusPayload
    | AddItemToOrderPayload
    | PayOrderPayload;

/**
 * Resultado de operaciones de order
 */
export interface OrderOperationResult {
    success: boolean;
    action: OrderAction;
    tenant_id: number;
    orden_id?: number;
    data?: unknown;
    error?: string;
    error_code?: string;
}
