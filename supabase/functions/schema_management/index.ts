// Edge Function: schema_management
// Multi-action function for schema migration management
// Actions: record, list, status

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { callRpc } from "../_shared/supabase-client.ts";
import {
  SchemaManagementPayload,
  SchemaOperationResult,
  jsonResponse,
  errorResponse,
} from "../_shared/types.ts";

/**
 * Handler principal de schema_management
 * Soporta múltiples acciones via POST con { action: "record"|"list"|"status", schema_name: string, ... }
 */
Deno.serve(async (req: Request): Promise<Response> => {
  // Solo POST permitido
  if (req.method !== "POST") {
    return errorResponse("method_not_allowed", "Only POST is allowed", 405);
  }

  // Parsear body
  let payload: SchemaManagementPayload;
  try {
    payload = await req.json();
  } catch {
    return errorResponse("invalid_json", "Could not parse request body", 400);
  }

  // Validar campos requeridos
  if (!payload.action) {
    return errorResponse("missing_action", "action is required", 400);
  }
  if (!payload.schema_name || typeof payload.schema_name !== "string" || payload.schema_name.trim() === "") {
    return errorResponse("invalid_schema_name", "schema_name must be a non-empty string", 400);
  }

  // Router de acciones
  switch (payload.action) {
    case "record":
      return handleRecord(payload);
    case "list":
      return handleList(payload);
    case "status":
      return handleStatus(payload);
    default:
      return errorResponse(
        "invalid_action",
        `Unknown action: ${payload.action}. Valid: record, list, status`,
        400
      );
  }
});

// ============================================================================
// Action Handlers
// ============================================================================

/**
 * RECORD: Registrar migración aplicada
 */
async function handleRecord(payload: SchemaManagementPayload): Promise<Response> {
  if (payload.action !== "record") return errorResponse("invalid_action", "", 400);

  const { schema_name, migration_name, checksum, applied_by } = payload as any;

  if (!migration_name) {
    return errorResponse("missing_migration_name", "migration_name is required for record action", 400);
  }

  const rpcPayload = {
    p_schema_name: schema_name,
    p_migration_name: migration_name,
    p_checksum: checksum || null,
    p_applied_by: applied_by || null,
  };

  const { data, error, status } = await callRpc(
    "record_schema_migration",
    rpcPayload
  );

  if (error) {
    let errorCode = "record_failed";
    if (error.includes("already recorded")) errorCode = "migration_already_recorded";
    
    return jsonResponse(
      { 
        success: false, 
        action: "record", 
        schema_name, 
        error,
        error_code: errorCode,
      } as SchemaOperationResult,
      status
    );
  }

  return jsonResponse({
    success: true,
    action: "record",
    schema_name,
    data,
  } as SchemaOperationResult);
}

/**
 * LIST: Listar migraciones de schema
 */
async function handleList(payload: SchemaManagementPayload): Promise<Response> {
  if (payload.action !== "list") return errorResponse("invalid_action", "", 400);

  const { schema_name } = payload;

  const { data, error, status } = await callRpc("get_schema_migrations", {
    p_schema_name: schema_name,
  });

  if (error) {
    return jsonResponse(
      { 
        success: false, 
        action: "list", 
        schema_name, 
        error,
        error_code: "list_failed",
      } as SchemaOperationResult,
      status
    );
  }

  return jsonResponse({
    success: true,
    action: "list",
    schema_name,
    data,
  } as SchemaOperationResult);
}

/**
 * STATUS: Estado de migraciones de schema
 */
async function handleStatus(payload: SchemaManagementPayload): Promise<Response> {
  if (payload.action !== "status") return errorResponse("invalid_action", "", 400);

  const { schema_name } = payload;

  // Primero obtenemos la lista de migraciones
  const { data: migrationsData, error, status } = await callRpc("get_schema_migrations", {
    p_schema_name: schema_name,
  });

  if (error) {
    return jsonResponse(
      { 
        success: false, 
        action: "status", 
        schema_name, 
        error,
        error_code: "status_failed",
      } as SchemaOperationResult,
      status
    );
  }

  // Procesar datos para generar estado
  const migrations = migrationsData?.migrations || [];
  const count = migrations.length;
  const latestMigration = count > 0 ? migrations[count - 1] : null;

  const statusData = {
    schema_name,
    total_migrations: count,
    latest_migration: latestMigration ? {
      migration_name: latestMigration.migration_name,
      applied_at: latestMigration.applied_at,
      applied_by: latestMigration.applied_by,
      checksum: latestMigration.checksum,
    } : null,
    all_migrations: migrations,
  };

  return jsonResponse({
    success: true,
    action: "status",
    schema_name,
    data: statusData,
  } as SchemaOperationResult);
}