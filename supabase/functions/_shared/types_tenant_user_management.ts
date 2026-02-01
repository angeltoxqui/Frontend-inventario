/**
 * Types para Tenant User Management Edge Function
 */

/**
 * Acciones disponibles para tenant-user-management
 */
export type TenantUserAction = "create" | "update" | "pause" | "resume" | "list";

/**
 * Payload base para todas las acciones de tenant-user
 */
export interface TenantUserActionPayload {
  action: TenantUserAction;
  tenant_id?: number; // Optional: para crear usuarios sin tenant asignado
}

/**
 * Payload para crear tenant-user mapping (email-based)
 */
export interface CreateTenantUserPayload extends TenantUserActionPayload {
  action: "create";
  email: string; // Required: primary identifier
  name?: string; // Optional: display name
  role?: "owner" | "admin";
  user_id?: string; // Optional: explicit user_id (will lookup from auth.users if omitted)
}

/**
 * Payload para actualizar tenant-user
 */
export interface UpdateTenantUserPayload extends TenantUserActionPayload {
  action: "update";
  user_id: string;
  email?: string; // Optional: update email
  name?: string; // Optional: update display name
  role?: "owner" | "admin"; // Optional: update role
}

/**
 * Payload para pausar tenant-user
 */
export interface PauseTenantUserPayload extends TenantUserActionPayload {
  action: "pause";
  user_id: string;
  reason?: string;
}

/**
 * Payload para reactivar tenant-user
 */
export interface ResumeTenantUserPayload extends TenantUserActionPayload {
  action: "resume";
  user_id: string;
}

/**
 * Payload para listar tenant-users
 */
export interface ListTenantUsersPayload extends TenantUserActionPayload {
  action: "list";
}

/**
 * Union type de todos los payloads de tenant-user posibles
 */
export type TenantUserManagementPayload =
  | CreateTenantUserPayload
  | UpdateTenantUserPayload
  | PauseTenantUserPayload
  | ResumeTenantUserPayload
  | ListTenantUsersPayload;

/**
 * Resultado de operaciones de tenant-user
 */
export interface TenantUserOperationResult {
  success: boolean;
  action: TenantUserAction;
  tenant_id?: number; // Optional: puede ser null para usuarios sin tenant
  user_id?: string;
  data?: Record<string, unknown>;
  error?: string;
  error_code?: string;
  hint?: string;
}