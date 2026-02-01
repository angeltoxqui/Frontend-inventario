// supabase/functions/order_management/index.ts
// Edge Function para gestión de órdenes del POS

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callRpc } from "../_shared/supabase-client.ts";
import {
    jsonResponse,
    structuredErrorResponse,
    type OrderManagementPayload,
    type OrderOperationResult,
} from "../_shared/types.ts";

serve(async (req: Request): Promise<Response> => {
    if (req.method !== "POST") {
        return structuredErrorResponse("METHOD_NOT_ALLOWED", "Only POST is allowed", 405);
    }

    let payload: OrderManagementPayload;
    try {
        payload = await req.json();
    } catch {
        return structuredErrorResponse("INVALID_JSON", "Request body must be valid JSON", 400);
    }

    if (!payload.action) {
        return structuredErrorResponse("MISSING_ACTION", "action field is required", 400);
    }
    if (!payload.tenant_id) {
        return structuredErrorResponse("MISSING_TENANT_ID", "tenant_id field is required", 400);
    }

    const { action, tenant_id } = payload;

    try {
        switch (action) {
            // ============================================================
            // LIST - Listar órdenes
            // ============================================================
            case "list": {
                const { data, error } = await callRpc<unknown[]>("get_tenant_orders", {
                    p_tenant_id: tenant_id,
                    p_estado: payload.estado || null,
                    p_mesa_id: payload.mesa_id || null,
                    p_limit: payload.limit || 50,
                    p_offset: payload.offset || 0,
                });

                if (error) {
                    return jsonResponse({
                        success: false,
                        action,
                        tenant_id,
                        error,
                        error_code: "LIST_FAILED",
                    } as OrderOperationResult, 400);
                }

                return jsonResponse({
                    success: true,
                    action,
                    tenant_id,
                    data,
                } as OrderOperationResult);
            }

            // ============================================================
            // CREATE - Crear orden
            // ============================================================
            case "create": {
                if (!payload.mesa_id || !payload.items || payload.items.length === 0) {
                    return structuredErrorResponse(
                        "MISSING_FIELDS",
                        "mesa_id and items are required",
                        400
                    );
                }

                const { data, error } = await callRpc<{ orden_id: number; total: number }>(
                    "create_tenant_order",
                    {
                        p_tenant_id: tenant_id,
                        p_mesa_id: payload.mesa_id,
                        p_cliente_id: payload.cliente_id || null,
                        p_items: JSON.stringify(payload.items),
                    }
                );

                if (error) {
                    return jsonResponse({
                        success: false,
                        action,
                        tenant_id,
                        error,
                        error_code: "CREATE_FAILED",
                    } as OrderOperationResult, 400);
                }

                return jsonResponse({
                    success: true,
                    action,
                    tenant_id,
                    orden_id: (data as any)?.orden_id,
                    data,
                } as OrderOperationResult, 201);
            }

            // ============================================================
            // UPDATE_STATUS - Cambiar estado de orden
            // ============================================================
            case "update_status": {
                if (!payload.orden_id || !payload.estado) {
                    return structuredErrorResponse(
                        "MISSING_FIELDS",
                        "orden_id and estado are required",
                        400
                    );
                }

                const { data, error } = await callRpc<unknown>("update_tenant_order_status", {
                    p_tenant_id: tenant_id,
                    p_orden_id: payload.orden_id,
                    p_estado: payload.estado,
                });

                if (error) {
                    return jsonResponse({
                        success: false,
                        action,
                        tenant_id,
                        error,
                        error_code: "UPDATE_STATUS_FAILED",
                    } as OrderOperationResult, 400);
                }

                return jsonResponse({
                    success: true,
                    action,
                    tenant_id,
                    orden_id: payload.orden_id,
                    data,
                } as OrderOperationResult);
            }

            // ============================================================
            // ADD_ITEM - Agregar item a orden existente
            // ============================================================
            case "add_item": {
                if (!payload.orden_id || !payload.producto_id || !payload.cantidad) {
                    return structuredErrorResponse(
                        "MISSING_FIELDS",
                        "orden_id, producto_id, and cantidad are required",
                        400
                    );
                }

                const { data, error } = await callRpc<unknown>("add_item_to_tenant_order", {
                    p_tenant_id: tenant_id,
                    p_orden_id: payload.orden_id,
                    p_producto_id: payload.producto_id,
                    p_cantidad: payload.cantidad,
                    p_nota: payload.nota || null,
                });

                if (error) {
                    return jsonResponse({
                        success: false,
                        action,
                        tenant_id,
                        error,
                        error_code: "ADD_ITEM_FAILED",
                    } as OrderOperationResult, 400);
                }

                return jsonResponse({
                    success: true,
                    action,
                    tenant_id,
                    orden_id: payload.orden_id,
                    data,
                } as OrderOperationResult);
            }

            // ============================================================
            // PAY - Pagar orden
            // ============================================================
            case "pay": {
                if (!payload.orden_id || !payload.tipo_pago) {
                    return structuredErrorResponse(
                        "MISSING_FIELDS",
                        "orden_id and tipo_pago are required",
                        400
                    );
                }

                const { data, error } = await callRpc<unknown>("pay_tenant_order", {
                    p_tenant_id: tenant_id,
                    p_orden_id: payload.orden_id,
                    p_tipo_pago: payload.tipo_pago,
                    p_propina: payload.propina || 0,
                    p_es_factura: payload.es_factura_electronica || false,
                });

                if (error) {
                    return jsonResponse({
                        success: false,
                        action,
                        tenant_id,
                        error,
                        error_code: "PAY_FAILED",
                    } as OrderOperationResult, 400);
                }

                return jsonResponse({
                    success: true,
                    action,
                    tenant_id,
                    orden_id: payload.orden_id,
                    data,
                } as OrderOperationResult);
            }

            default:
                return structuredErrorResponse(
                    "INVALID_ACTION",
                    `Action '${action}' is not supported. Valid: list, create, update_status, add_item, pay`,
                    400
                );
        }
    } catch (err) {
        console.error("[order_management] Unexpected error:", err);
        return structuredErrorResponse("INTERNAL_ERROR", String(err), 500);
    }
});
