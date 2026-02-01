/**
 * Types para Superadmin Management Edge Function
 */

/**
 * Acciones disponibles para superadmin-management
 */
export type SuperadminAction = "create" | "update" | "pause" | "resume" | "list";

/**
 * Payload base para todas las acciones de superadmin
 */
export interface SuperadminActionPayload {
  action: SuperadminAction;
}

/**
 * Payload para crear superadmin (email-based)
 */
export interface CreateSuperadminPayload extends SuperadminActionPayload {
  action: "create";
  email: string; // Required: primary identifier
  name?: string; // Optional: display name
  user_id?: string; // Optional: explicit user_id (will lookup from auth.users if omitted)
  created_by: string;
}

/**
 * Payload para actualizar superadmin
 */
export interface UpdateSuperadminPayload extends SuperadminActionPayload {
  action: "update";
  user_id: string;
  updated_by: string;
  email?: string;
  name?: string; // Added: support updating display name
  is_active?: boolean;
}

/**
 * Payload para pausar superadmin
 */
export interface PauseSuperadminPayload extends SuperadminActionPayload {
  action: "pause";
  user_id: string;
  updated_by: string;
  reason?: string;
}

/**
 * Payload para reactivar superadmin
 */
export interface ResumeSuperadminPayload extends SuperadminActionPayload {
  action: "resume";
  user_id: string;
  updated_by: string;
}

/**
 * Payload para listar superadmins
 */
export interface ListSuperadminsPayload extends SuperadminActionPayload {
  action: "list";
}

/**
 * Union type de todos los payloads de superadmin posibles
 */
export type SuperadminManagementPayload =
  | CreateSuperadminPayload
  | UpdateSuperadminPayload
  | PauseSuperadminPayload
  | ResumeSuperadminPayload
  | ListSuperadminsPayload;

/**
 * Resultado de operaciones de superadmin
 */
export interface SuperadminOperationResult {
  success: boolean;
  action: SuperadminAction;
  user_id?: string;
  data?: any;
  error?: string;
  error_code?: string;
  hint?: string;
}