// Edge Function: tenant_management
// Multi-action function for tenant lifecycle management
// Actions: create, update, pause, resume, delete

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { callRpc } from "../_shared/supabase-client.ts";
import {
  TenantManagementPayload,
  TenantOperationResult,
  CreateStoreTenantResult,
  jsonResponse,
  errorResponse,
} from "../_shared/types.ts";

/**
 * Handler principal de tenant_management
 * Soporta múltiples acciones via POST con { action: "create"|"update"|"pause"|"resume"|"delete", ... }
 */
Deno.serve(async (req: Request): Promise<Response> => {
  // Solo POST permitido
  if (req.method !== "POST") {
    return errorResponse("method_not_allowed", "Only POST is allowed", 405);
  }

  // Parsear body
  let payload: TenantManagementPayload;
  try {
    payload = await req.json();
  } catch {
    return errorResponse("invalid_json", "Could not parse request body", 400);
  }

  // Validar campos requeridos
  if (!payload.action) {
    return errorResponse("missing_action", "action is required", 400);
  }
  
  // Validar campos según acción
  if (payload.action === "create") {
    // Para create, name y owner_email son requeridos
    if (!payload.name || typeof payload.name !== "string") {
      return errorResponse("invalid_name", "name is required for create action", 400);
    }
    if (!payload.owner_email || typeof payload.owner_email !== "string") {
      return errorResponse("invalid_owner_email", "owner_email is required for create action", 400);
    }
  } else if (payload.action !== "list") {
    // Para otras acciones (update, pause, resume), tenant_id es requerido
    if (typeof payload.tenant_id !== "number" || payload.tenant_id < 1) {
      return errorResponse("invalid_tenant_id", "tenant_id must be a positive number", 400);
    }
  }

  // Router de acciones
  switch (payload.action) {
    case "create":
      return handleCreate(payload);
    case "update":
      return handleUpdate(payload);
    case "pause":
      return handlePause(payload);
    case "resume":
      return handleResume(payload);
    case "list":
      return handleList(payload);
    default:
      return errorResponse(
        "invalid_action",
        `Unknown action: ${payload.action}. Valid: create, update, pause, resume, list`,
        400
      );
  }
});

// ============================================================================
// Action Handlers
// ============================================================================

/**
 * CREATE: Crear nuevo tenant con schema y tablas (email-based owner)
 */
async function handleCreate(payload: TenantManagementPayload): Promise<Response> {
  if (payload.action !== "create") return errorResponse("invalid_action", "", 400);

  const { name, owner_email, owner_name, plan, tenant_id, owner_user_id } = payload;

  // Validaciones ya hechas en el router principal
  if (!name || !owner_email) {
    return errorResponse("missing_fields", "name and owner_email are required", 400);
  }

  const rpcPayload = {
    p_name: name,
    p_owner_email: owner_email,
    p_owner_name: owner_name || null,
    p_plan: plan || "basic",
    p_tenant_id: tenant_id || null, // Optional: will auto-generate if omitted
    p_owner_user_id: owner_user_id || null, // Optional: will lookup from auth.users if omitted
  };

  const { data, error, status } = await callRpc<CreateStoreTenantResult>(
    "create_store_tenant",
    rpcPayload
  );

  if (error) {
    return jsonResponse(
      { success: false, action: "create", owner_email, error } as TenantOperationResult,
      status
    );
  }

  return jsonResponse({
    success: true,
    action: "create",
    tenant_id: data?.tenant_id,
    schema_name: data?.schema_name,
    owner_email,
    data,
  } as TenantOperationResult);
}

/**
 * UPDATE: Actualizar metadata del tenant (nombre, plan, meta)
 */
async function handleUpdate(payload: TenantManagementPayload): Promise<Response> {
  if (payload.action !== "update") return errorResponse("invalid_action", "", 400);

  const { tenant_id, name, plan, meta } = payload;

  // Construir payload solo con campos proporcionados
  const rpcPayload: Record<string, unknown> = { p_tenant_id: tenant_id };
  if (name !== undefined) rpcPayload.p_name = name;
  if (plan !== undefined) rpcPayload.p_plan = plan;
  if (meta !== undefined) rpcPayload.p_meta = meta;

  const { data, error, status } = await callRpc("update_store_tenant", rpcPayload);

  if (error) {
    return jsonResponse(
      { success: false, action: "update", tenant_id, error } as TenantOperationResult,
      status
    );
  }

  return jsonResponse({
    success: true,
    action: "update",
    tenant_id,
    data,
  } as TenantOperationResult);
}

/**
 * PAUSE: Suspender tenant (status = 'suspended')
 */
async function handlePause(payload: TenantManagementPayload): Promise<Response> {
  if (payload.action !== "pause") return errorResponse("invalid_action", "", 400);

  const { tenant_id } = payload;
  const reason = "reason" in payload ? payload.reason : undefined;

  const { data, error, status } = await callRpc("pause_store_tenant", {
    p_tenant_id: tenant_id,
    p_reason: reason || null,
  });

  if (error) {
    // Better error categorization
    let errorCode = "pause_failed";
    if (error.includes("does not exist")) errorCode = "tenant_not_found";
    if (error.includes("already suspended")) errorCode = "already_suspended";
    if (error.includes("must be active")) errorCode = "not_active";
    
    return jsonResponse(
      { 
        success: false, 
        action: "pause", 
        tenant_id, 
        error,
        error_code: errorCode,
        hint: error.includes("already suspended") ? "Tenant is already suspended, no action needed" : undefined
      } as TenantOperationResult,
      status
    );
  }

  return jsonResponse({
    success: true,
    action: "pause",
    tenant_id,
    data,
  } as TenantOperationResult);
}

/**
 * RESUME: Reactivar tenant (status = 'active')
 */
async function handleResume(payload: TenantManagementPayload): Promise<Response> {
  if (payload.action !== "resume") return errorResponse("invalid_action", "", 400);

  const { tenant_id } = payload;

  const { data, error, status } = await callRpc("resume_store_tenant", {
    p_tenant_id: tenant_id,
  });

  if (error) {
    // Better error categorization
    let errorCode = "resume_failed";
    if (error.includes("does not exist")) errorCode = "tenant_not_found";
    if (error.includes("already active")) errorCode = "already_active";
    if (error.includes("must be suspended")) errorCode = "not_suspended";
    
    return jsonResponse(
      { 
        success: false, 
        action: "resume", 
        tenant_id, 
        error,
        error_code: errorCode,
        hint: error.includes("already active") ? "Tenant is already active, no action needed" : undefined
      } as TenantOperationResult,
      status
    );
  }

  return jsonResponse({
    success: true,
    action: "resume",
    tenant_id,
    data,
  } as TenantOperationResult);
}

/**
 * LIST: Listar todos los tenants con paginación
 */
async function handleList(payload: TenantManagementPayload): Promise<Response> {
  if (payload.action !== "list") return errorResponse("invalid_action", "", 400);

  // TypeScript narrowing - después de la verificación de action, sabemos que es ListTenantsPayload
  const listPayload = payload as Extract<TenantManagementPayload, { action: "list" }>;
  const { limit, offset, status } = listPayload;

  const { data, error, status: rpcStatus } = await callRpc("get_tenants", {
    p_limit: limit || 100,
    p_offset: offset || 0,
    p_status: status || null,
  });

  if (error) {
    let errorCode = "list_failed";
    if (error.includes("Invalid status")) errorCode = "invalid_status_filter";
    
    return jsonResponse(
      { 
        success: false, 
        action: "list", 
        error,
        error_code: errorCode,
        hint: error.includes("Invalid status") ? "Valid status filters: active, suspended, pending" : undefined
      } as TenantOperationResult,
      rpcStatus
    );
  }

  return jsonResponse({
    success: true,
    action: "list",
    data,
  } as TenantOperationResult);
}