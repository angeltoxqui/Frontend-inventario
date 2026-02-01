// supabase/functions/table_management/index.ts
// Edge Function para gestión de mesas del POS

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callRpc } from "../_shared/supabase-client.ts";
import {
    jsonResponse,
    structuredErrorResponse,
    type TableManagementPayload,
    type TableOperationResult,
} from "../_shared/types.ts";

serve(async (req: Request): Promise<Response> => {
    if (req.method !== "POST") {
        return structuredErrorResponse("METHOD_NOT_ALLOWED", "Only POST is allowed", 405);
    }

    let payload: TableManagementPayload;
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
            // LIST - Listar mesas
            // ============================================================
            case "list": {
                const { data, error } = await callRpc<unknown[]>("get_tenant_tables", {
                    p_tenant_id: tenant_id,
                });

                if (error) {
                    return jsonResponse({
                        success: false,
                        action,
                        tenant_id,
                        error,
                        error_code: "LIST_FAILED",
                    } as TableOperationResult, 400);
                }

                return jsonResponse({
                    success: true,
                    action,
                    tenant_id,
                    data,
                } as TableOperationResult);
            }

            // ============================================================
            // CREATE - Crear mesa
            // ============================================================
            case "create": {
                if (!payload.nombre) {
                    return structuredErrorResponse(
                        "MISSING_NOMBRE",
                        "nombre is required",
                        400
                    );
                }

                const { data, error } = await callRpc<{ mesa_id: number }>(
                    "create_tenant_table",
                    {
                        p_tenant_id: tenant_id,
                        p_nombre: payload.nombre,
                        p_notas: payload.notas || null,
                    }
                );

                if (error) {
                    return jsonResponse({
                        success: false,
                        action,
                        tenant_id,
                        error,
                        error_code: "CREATE_FAILED",
                    } as TableOperationResult, 400);
                }

                return jsonResponse({
                    success: true,
                    action,
                    tenant_id,
                    mesa_id: (data as any)?.mesa_id,
                    data,
                } as TableOperationResult, 201);
            }

            // ============================================================
            // UPDATE - Actualizar mesa
            // ============================================================
            case "update": {
                if (!payload.mesa_id) {
                    return structuredErrorResponse(
                        "MISSING_MESA_ID",
                        "mesa_id is required",
                        400
                    );
                }

                const { data, error } = await callRpc<unknown>("update_tenant_table", {
                    p_tenant_id: tenant_id,
                    p_mesa_id: payload.mesa_id,
                    p_nombre: payload.nombre || null,
                    p_notas: payload.notas || null,
                });

                if (error) {
                    return jsonResponse({
                        success: false,
                        action,
                        tenant_id,
                        error,
                        error_code: "UPDATE_FAILED",
                    } as TableOperationResult, 400);
                }

                return jsonResponse({
                    success: true,
                    action,
                    tenant_id,
                    mesa_id: payload.mesa_id,
                    data,
                } as TableOperationResult);
            }

            // ============================================================
            // UPDATE_STATUS - Cambiar estado ocupada/libre
            // ============================================================
            case "update_status": {
                if (!payload.mesa_id || payload.ocupada === undefined) {
                    return structuredErrorResponse(
                        "MISSING_FIELDS",
                        "mesa_id and ocupada are required",
                        400
                    );
                }

                const { data, error } = await callRpc<unknown>("update_tenant_table_status", {
                    p_tenant_id: tenant_id,
                    p_mesa_id: payload.mesa_id,
                    p_ocupada: payload.ocupada,
                });

                if (error) {
                    return jsonResponse({
                        success: false,
                        action,
                        tenant_id,
                        error,
                        error_code: "UPDATE_STATUS_FAILED",
                    } as TableOperationResult, 400);
                }

                return jsonResponse({
                    success: true,
                    action,
                    tenant_id,
                    mesa_id: payload.mesa_id,
                    data,
                } as TableOperationResult);
            }

            default:
                return structuredErrorResponse(
                    "INVALID_ACTION",
                    `Action '${action}' is not supported. Valid: list, create, update, update_status`,
                    400
                );
        }
    } catch (err) {
        console.error("[table_management] Unexpected error:", err);
        return structuredErrorResponse("INTERNAL_ERROR", String(err), 500);
    }
});
