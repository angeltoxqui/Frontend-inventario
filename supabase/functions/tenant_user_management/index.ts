// Edge Function: tenant_user_management
// Multi-action function for tenant user management
// Actions: create, update, delete, list

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { callRpc } from "../_shared/supabase-client.ts";
import {
  TenantUserManagementPayload,
  TenantUserOperationResult,
  jsonResponse,
  errorResponse,
} from "../_shared/types.ts";

/**
 * Handler principal de tenant_user_management
 * Soporta múltiples acciones via POST con { action: "create"|"update"|"delete"|"list", tenant_id: number, ... }
 */
Deno.serve(async (req: Request): Promise<Response> => {
  // Solo POST permitido
  if (req.method !== "POST") {
    return errorResponse("method_not_allowed", "Only POST is allowed", 405);
  }

  // Parsear body
  let payload: TenantUserManagementPayload;
  try {
    payload = await req.json();
  } catch {
    return errorResponse("invalid_json", "Could not parse request body", 400);
  }

  // Validar campos requeridos
  if (!payload.action) {
    return errorResponse("missing_action", "action is required", 400);
  }
  
  // tenant_id es requerido para todas las acciones en tenant_user_management
  if (typeof payload.tenant_id !== "number" || payload.tenant_id < 1) {
    return errorResponse("invalid_tenant_id", "tenant_id must be a positive number", 400);
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
 * CREATE: Crear nuevo tenant-user mapping (email-based)
 */
async function handleCreate(payload: TenantUserManagementPayload): Promise<Response> {
  if (payload.action !== "create") return errorResponse("invalid_action", "", 400);

  const { tenant_id, email, name, role, user_id } = payload;

  // Validar email (requerido)
  if (!email || typeof email !== "string") {
    return errorResponse("invalid_email", "email is required for create action", 400);
  }

  const rpcPayload = {
    p_tenant_id: tenant_id,
    p_email: email,
    p_name: name || null,
    p_role: role || "admin",
    p_user_id: user_id || null, // Optional: will lookup from auth.users if omitted
  };

  const { data, error, status } = await callRpc(
    "create_tenant_user",
    rpcPayload
  );

  if (error) {
    let errorCode = "create_failed";
    if (error.includes("already mapped")) errorCode = "user_already_mapped";
    if (error.includes("does not exist")) errorCode = "tenant_not_found";
    if (error.includes("not found in auth.users")) errorCode = "user_not_registered";
    
    return jsonResponse(
      { 
        success: false, 
        action: "create", 
        tenant_id, 
        email, 
        error,
        error_code: errorCode,
      } as TenantUserOperationResult,
      status
    );
  }

  return jsonResponse({
    success: true,
    action: "create",
    tenant_id,
    user_id,
    data,
  } as TenantUserOperationResult);
}

/**
 * UPDATE: Actualizar rol de tenant-user
 */
async function handleUpdate(payload: TenantUserManagementPayload): Promise<Response> {
  if (payload.action !== "update") return errorResponse("invalid_action", "", 400);

  const { tenant_id, user_id, role } = payload as any;

  if (!user_id) {
    return errorResponse("missing_user_id", "user_id is required for update action", 400);
  }
  if (!role) {
    return errorResponse("missing_role", "role is required for update action", 400);
  }

  const { data, error, status } = await callRpc("update_tenant_user", {
    p_tenant_id: tenant_id,
    p_user_id: user_id,
    p_role: role,
  });

  if (error) {
    let errorCode = "update_failed";
    if (error.includes("not mapped")) errorCode = "user_not_mapped";
    
    return jsonResponse(
      { 
        success: false, 
        action: "update", 
        tenant_id, 
        user_id, 
        error,
        error_code: errorCode,
      } as TenantUserOperationResult,
      status
    );
  }

  return jsonResponse({
    success: true,
    action: "update",
    tenant_id,
    user_id,
    data,
  } as TenantUserOperationResult);
}

/**
 * PAUSE: Pausar usuario de tenant
 */
async function handlePause(payload: TenantUserManagementPayload): Promise<Response> {
  if (payload.action !== "pause") return errorResponse("invalid_action", "", 400);

  const { tenant_id, user_id, reason } = payload as any;

  if (!user_id) {
    return errorResponse("missing_user_id", "user_id is required for pause action", 400);
  }

  const { data, error, status } = await callRpc("pause_tenant_user", {
    p_tenant_id: tenant_id,
    p_user_id: user_id,
    p_reason: reason,
  });

  if (error) {
    let errorCode = "pause_failed";
    if (error.includes("not found")) errorCode = "user_not_mapped";
    
    return jsonResponse(
      { 
        success: false, 
        action: "pause", 
        tenant_id, 
        user_id, 
        error,
        error_code: errorCode,
      } as TenantUserOperationResult,
      status
    );
  }

  return jsonResponse({
    success: true,
    action: "pause",
    tenant_id,
    user_id,
    data,
  } as TenantUserOperationResult);
}

/**
 * RESUME: Reactivar usuario de tenant
 */
async function handleResume(payload: TenantUserManagementPayload): Promise<Response> {
  if (payload.action !== "resume") return errorResponse("invalid_action", "", 400);

  const { tenant_id, user_id } = payload as any;

  if (!user_id) {
    return errorResponse("missing_user_id", "user_id is required for resume action", 400);
  }

  const { data, error, status } = await callRpc("resume_tenant_user", {
    p_tenant_id: tenant_id,
    p_user_id: user_id,
  });

  if (error) {
    let errorCode = "resume_failed";
    if (error.includes("not found")) errorCode = "user_not_mapped";
    
    return jsonResponse(
      { 
        success: false, 
        action: "resume", 
        tenant_id, 
        user_id, 
        error,
        error_code: errorCode,
      } as TenantUserOperationResult,
      status
    );
  }

  return jsonResponse({
    success: true,
    action: "resume",
    tenant_id,
    user_id,
    data,
  } as TenantUserOperationResult);
}

/**
 * LIST: Listar usuarios de tenant
 */
async function handleList(payload: TenantUserManagementPayload): Promise<Response> {
  if (payload.action !== "list") return errorResponse("invalid_action", "", 400);

  const { tenant_id } = payload;

  const { data, error, status } = await callRpc("get_tenant_users", {
    p_tenant_id: tenant_id,
  });

  if (error) {
    let errorCode = "list_failed";
    if (error.includes("does not exist")) errorCode = "tenant_not_found";
    
    return jsonResponse(
      { 
        success: false, 
        action: "list", 
        tenant_id, 
        error,
        error_code: errorCode,
      } as TenantUserOperationResult,
      status
    );
  }

  return jsonResponse({
    success: true,
    action: "list",
    tenant_id,
    data,
  } as TenantUserOperationResult);
}