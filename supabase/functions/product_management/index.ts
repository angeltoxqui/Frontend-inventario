// supabase/functions/product_management/index.ts
// Edge Function para gestión de productos del POS
// Sigue la misma arquitectura que tenant_management

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callRpc } from "../_shared/supabase-client.ts";
import {
    jsonResponse,
    structuredErrorResponse,
    type ProductManagementPayload,
    type ProductOperationResult,
} from "../_shared/types.ts";

serve(async (req: Request): Promise<Response> => {
    // Solo permitir POST
    if (req.method !== "POST") {
        return structuredErrorResponse("METHOD_NOT_ALLOWED", "Only POST is allowed", 405);
    }

    let payload: ProductManagementPayload;
    try {
        payload = await req.json();
    } catch {
        return structuredErrorResponse("INVALID_JSON", "Request body must be valid JSON", 400);
    }

    // Validar campos requeridos
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
            // LIST - Listar productos del tenant
            // ============================================================
            case "list": {
                const { data, error } = await callRpc<unknown[]>("get_tenant_products", {
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
                    } as ProductOperationResult, 400);
                }

                return jsonResponse({
                    success: true,
                    action,
                    tenant_id,
                    data,
                } as ProductOperationResult);
            }

            // ============================================================
            // CREATE - Crear producto
            // ============================================================
            case "create": {
                if (!payload.nombre || payload.precio === undefined) {
                    return structuredErrorResponse(
                        "MISSING_FIELDS",
                        "nombre and precio are required",
                        400
                    );
                }

                const { data, error } = await callRpc<{ producto_id: number }>(
                    "create_tenant_product",
                    {
                        p_tenant_id: tenant_id,
                        p_nombre: payload.nombre,
                        p_precio: payload.precio,
                        p_nota: payload.nota || null,
                        p_receta: payload.receta ? JSON.stringify(payload.receta) : null,
                    }
                );

                if (error) {
                    return jsonResponse({
                        success: false,
                        action,
                        tenant_id,
                        error,
                        error_code: "CREATE_FAILED",
                    } as ProductOperationResult, 400);
                }

                return jsonResponse({
                    success: true,
                    action,
                    tenant_id,
                    producto_id: (data as any)?.producto_id,
                    data,
                } as ProductOperationResult, 201);
            }

            // ============================================================
            // UPDATE - Actualizar producto
            // ============================================================
            case "update": {
                if (!payload.producto_id) {
                    return structuredErrorResponse(
                        "MISSING_PRODUCTO_ID",
                        "producto_id is required",
                        400
                    );
                }

                const { data, error } = await callRpc<unknown>("update_tenant_product", {
                    p_tenant_id: tenant_id,
                    p_producto_id: payload.producto_id,
                    p_nombre: payload.nombre || null,
                    p_precio: payload.precio || null,
                    p_nota: payload.nota || null,
                    p_receta: payload.receta ? JSON.stringify(payload.receta) : null,
                });

                if (error) {
                    return jsonResponse({
                        success: false,
                        action,
                        tenant_id,
                        error,
                        error_code: "UPDATE_FAILED",
                    } as ProductOperationResult, 400);
                }

                return jsonResponse({
                    success: true,
                    action,
                    tenant_id,
                    producto_id: payload.producto_id,
                    data,
                } as ProductOperationResult);
            }

            // ============================================================
            // DELETE - Eliminar producto
            // ============================================================
            case "delete": {
                if (!payload.producto_id) {
                    return structuredErrorResponse(
                        "MISSING_PRODUCTO_ID",
                        "producto_id is required",
                        400
                    );
                }

                const { data, error } = await callRpc<unknown>("delete_tenant_product", {
                    p_tenant_id: tenant_id,
                    p_producto_id: payload.producto_id,
                });

                if (error) {
                    return jsonResponse({
                        success: false,
                        action,
                        tenant_id,
                        error,
                        error_code: "DELETE_FAILED",
                    } as ProductOperationResult, 400);
                }

                return jsonResponse({
                    success: true,
                    action,
                    tenant_id,
                    producto_id: payload.producto_id,
                    data,
                } as ProductOperationResult);
            }

            default:
                return structuredErrorResponse(
                    "INVALID_ACTION",
                    `Action '${action}' is not supported. Valid: list, create, update, delete`,
                    400
                );
        }
    } catch (err) {
        console.error("[product_management] Unexpected error:", err);
        return structuredErrorResponse(
            "INTERNAL_ERROR",
            String(err),
            500
        );
    }
});
