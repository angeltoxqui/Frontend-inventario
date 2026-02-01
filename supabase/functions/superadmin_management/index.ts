// Edge Function: superadmin_management
// Multi-action function for superadmin lifecycle management
// Actions: create, update, pause, resume

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { callRpc } from "../_shared/supabase-client.ts";
import {
  SuperadminManagementPayload,
  SuperadminOperationResult,
  jsonResponse,
  errorResponse,
} from "../_shared/types.ts";

/**
 * Handler principal de superadmin_management
 * Soporta múltiples acciones via POST con { action: "create"|"update"|"pause"|"resume", user_id: "<uuid>", ... }
 */
Deno.serve(async (req: Request): Promise<Response> => {
  // Solo POST permitido
  if (req.method !== "POST") {
    return errorResponse("method_not_allowed", "Only POST is allowed", 405);
  }

  // Parsear body
  let payload: SuperadminManagementPayload;
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
    // Para create, email es requerido (no user_id)
    if (!payload.email || typeof payload.email !== "string") {
      return errorResponse("invalid_email", "email is required for create action", 400);
    }
  } else if (payload.action !== "list") {
    // Para otras acciones (update, pause, resume), user_id es requerido
    if (!payload.user_id || typeof payload.user_id !== "string") {
      return errorResponse("invalid_user_id", "user_id must be a valid UUID string", 400);
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
 * CREATE: Crear nuevo superadmin (email-based)
 */
async function handleCreate(payload: SuperadminManagementPayload): Promise<Response> {
  if (payload.action !== "create") return errorResponse("invalid_action", "", 400);

  const { email, name, user_id } = payload;

  // Validar email format básico
  if (!email || typeof email !== "string") {
    return errorResponse("invalid_email", "email is required", 400);
  }

  const rpcPayload = {
    p_email: email,
    p_name: name || null,
    p_user_id: user_id || null, // Optional: will lookup from auth.users if omitted
  };

  const { data, error, status } = await callRpc(
    "create_superadmin",
    rpcPayload
  );

  if (error) {
    return jsonResponse(
      { success: false, action: "create", email, error } as SuperadminOperationResult,
      status
    );
  }

  return jsonResponse({
    success: true,
    action: "create",
    email,
    data,
  } as SuperadminOperationResult);
}

/**
 * UPDATE: Actualizar email, name y/o status de superadmin
 */
async function handleUpdate(payload: SuperadminManagementPayload): Promise<Response> {
  if (payload.action !== "update") return errorResponse("invalid_action", "", 400);

  const { user_id, email, name, is_active } = payload as any;

  // Construir payload solo con campos proporcionados
  const rpcPayload: Record<string, unknown> = { 
    p_user_id: user_id,
    p_updated_by: user_id // Self-update for now, can be changed to accept updated_by
  };
  if (email !== undefined) rpcPayload.p_email = email;
  if (name !== undefined) rpcPayload.p_name = name;
  if (is_active !== undefined) rpcPayload.p_is_active = is_active;

  const { data, error, status } = await callRpc("update_superadmin", rpcPayload);

  if (error) {
    return jsonResponse(
      { success: false, action: "update", user_id, error } as SuperadminOperationResult,
      status
    );
  }

  return jsonResponse({
    success: true,
    action: "update",
    user_id,
    data,
  } as SuperadminOperationResult);
}

/**
 * PAUSE: Desactivar superadmin (is_active = false)
 */
async function handlePause(payload: SuperadminManagementPayload): Promise<Response> {
  if (payload.action !== "pause") return errorResponse("invalid_action", "", 400);

  const { user_id } = payload;
  const reason = "reason" in payload ? payload.reason : undefined;

  const { data, error, status } = await callRpc("pause_superadmin", {
    p_user_id: user_id,
    p_reason: reason || null,
  });

  if (error) {
    // Better error categorization
    let errorCode = "pause_failed";
    if (error.includes("does not exist")) errorCode = "superadmin_not_found";
    if (error.includes("already paused")) errorCode = "already_paused";
    
    return jsonResponse(
      { 
        success: false, 
        action: "pause", 
        user_id, 
        error,
        error_code: errorCode,
        hint: error.includes("already paused") ? "Superadmin is already paused, no action needed" : undefined
      } as SuperadminOperationResult,
      status
    );
  }

  return jsonResponse({
    success: true,
    action: "pause",
    user_id,
    data,
  } as SuperadminOperationResult);
}

/**
 * RESUME: Reactivar superadmin (is_active = true)
 */
async function handleResume(payload: SuperadminManagementPayload): Promise<Response> {
  if (payload.action !== "resume") return errorResponse("invalid_action", "", 400);

  const { user_id } = payload;

  const { data, error, status } = await callRpc("resume_superadmin", {
    p_user_id: user_id,
  });

  if (error) {
    // Better error categorization
    let errorCode = "resume_failed";
    if (error.includes("does not exist")) errorCode = "superadmin_not_found";
    if (error.includes("already active")) errorCode = "already_active";
    
    return jsonResponse(
      { 
        success: false, 
        action: "resume", 
        user_id, 
        error,
        error_code: errorCode,
        hint: error.includes("already active") ? "Superadmin is already active, no action needed" : undefined
      } as SuperadminOperationResult,
      status
    );
  }

  return jsonResponse({
    success: true,
    action: "resume",
    user_id,
    data,
  } as SuperadminOperationResult);
}

/**
 * LIST: Listar todos los superadmins
 */
async function handleList(payload: SuperadminManagementPayload): Promise<Response> {
  if (payload.action !== "list") return errorResponse("invalid_action", "", 400);

  const { data, error, status } = await callRpc("get_superadmins", {});

  if (error) {
    return jsonResponse(
      { 
        success: false, 
        action: "list", 
        error,
        error_code: "list_failed",
        hint: "Failed to retrieve superadmins list"
      } as SuperadminOperationResult,
      status
    );
  }

  return jsonResponse({
    success: true,
    action: "list",
    data,
  } as SuperadminOperationResult);
}
