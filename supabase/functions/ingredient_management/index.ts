// supabase/functions/ingredient_management/index.ts
// Edge Function para gestión de ingredientes/insumos del POS

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callRpc } from "../_shared/supabase-client.ts";
import {
    jsonResponse,
    structuredErrorResponse,
    type IngredientManagementPayload,
    type IngredientOperationResult,
} from "../_shared/types.ts";

serve(async (req: Request): Promise<Response> => {
    if (req.method !== "POST") {
        return structuredErrorResponse("METHOD_NOT_ALLOWED", "Only POST is allowed", 405);
    }

    let payload: IngredientManagementPayload;
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
            // LIST - Listar ingredientes
            // ============================================================
            case "list": {
                const { data, error } = await callRpc<unknown[]>("get_tenant_ingredients", {
                    p_tenant_id: tenant_id,
                    p_limit: payload.limit || 100,
                    p_offset: payload.offset || 0,
                });

                if (error) {
                    return jsonResponse({
                        success: false,
                        action,
                        tenant_id,
                        error,
                        error_code: "LIST_FAILED",
                    } as IngredientOperationResult, 400);
                }

                return jsonResponse({
                    success: true,
                    action,
                    tenant_id,
                    data,
                } as IngredientOperationResult);
            }

            // ============================================================
            // CREATE - Crear ingrediente
            // ============================================================
            case "create": {
                if (!payload.nombre || !payload.unidad_medida) {
                    return structuredErrorResponse(
                        "MISSING_FIELDS",
                        "nombre and unidad_medida are required",
                        400
                    );
                }

                const { data, error } = await callRpc<{ insumo_id: number }>(
                    "create_tenant_ingredient",
                    {
                        p_tenant_id: tenant_id,
                        p_nombre: payload.nombre,
                        p_unidad_medida: payload.unidad_medida,
                        p_costo: payload.costo || 0,
                        p_stock_actual: payload.stock_actual || 0,
                        p_nota: payload.nota || null,
                    }
                );

                if (error) {
                    return jsonResponse({
                        success: false,
                        action,
                        tenant_id,
                        error,
                        error_code: "CREATE_FAILED",
                    } as IngredientOperationResult, 400);
                }

                return jsonResponse({
                    success: true,
                    action,
                    tenant_id,
                    insumo_id: (data as any)?.insumo_id,
                    data,
                } as IngredientOperationResult, 201);
            }

            // ============================================================
            // UPDATE - Actualizar ingrediente
            // ============================================================
            case "update": {
                if (!payload.insumo_id) {
                    return structuredErrorResponse(
                        "MISSING_INSUMO_ID",
                        "insumo_id is required",
                        400
                    );
                }

                const { data, error } = await callRpc<unknown>("update_tenant_ingredient", {
                    p_tenant_id: tenant_id,
                    p_insumo_id: payload.insumo_id,
                    p_nombre: payload.nombre || null,
                    p_unidad_medida: payload.unidad_medida || null,
                    p_costo: payload.costo || null,
                    p_nota: payload.nota || null,
                });

                if (error) {
                    return jsonResponse({
                        success: false,
                        action,
                        tenant_id,
                        error,
                        error_code: "UPDATE_FAILED",
                    } as IngredientOperationResult, 400);
                }

                return jsonResponse({
                    success: true,
                    action,
                    tenant_id,
                    insumo_id: payload.insumo_id,
                    data,
                } as IngredientOperationResult);
            }

            // ============================================================
            // DELETE - Eliminar ingrediente
            // ============================================================
            case "delete": {
                if (!payload.insumo_id) {
                    return structuredErrorResponse(
                        "MISSING_INSUMO_ID",
                        "insumo_id is required",
                        400
                    );
                }

                const { data, error } = await callRpc<unknown>("delete_tenant_ingredient", {
                    p_tenant_id: tenant_id,
                    p_insumo_id: payload.insumo_id,
                });

                if (error) {
                    return jsonResponse({
                        success: false,
                        action,
                        tenant_id,
                        error,
                        error_code: "DELETE_FAILED",
                    } as IngredientOperationResult, 400);
                }

                return jsonResponse({
                    success: true,
                    action,
                    tenant_id,
                    insumo_id: payload.insumo_id,
                    data,
                } as IngredientOperationResult);
            }

            // ============================================================
            // ADJUST_STOCK - Ajustar stock
            // ============================================================
            case "adjust_stock": {
                if (!payload.insumo_id || payload.cantidad === undefined) {
                    return structuredErrorResponse(
                        "MISSING_FIELDS",
                        "insumo_id and cantidad are required",
                        400
                    );
                }

                const { data, error } = await callRpc<unknown>("adjust_tenant_ingredient_stock", {
                    p_tenant_id: tenant_id,
                    p_insumo_id: payload.insumo_id,
                    p_cantidad: payload.cantidad,
                    p_motivo: payload.motivo || null,
                });

                if (error) {
                    return jsonResponse({
                        success: false,
                        action,
                        tenant_id,
                        error,
                        error_code: "ADJUST_STOCK_FAILED",
                    } as IngredientOperationResult, 400);
                }

                return jsonResponse({
                    success: true,
                    action,
                    tenant_id,
                    insumo_id: payload.insumo_id,
                    data,
                } as IngredientOperationResult);
            }

            default:
                return structuredErrorResponse(
                    "INVALID_ACTION",
                    `Action '${action}' is not supported. Valid: list, create, update, delete, adjust_stock`,
                    400
                );
        }
    } catch (err) {
        console.error("[ingredient_management] Unexpected error:", err);
        return structuredErrorResponse("INTERNAL_ERROR", String(err), 500);
    }
});
