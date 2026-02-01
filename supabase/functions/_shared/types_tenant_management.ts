/**
 * Types para Tenant Management Edge Function
 */

/**
 * Acciones disponibles para tenant-management
 */
export type TenantAction = "create" | "update" | "pause" | "resume" | "list";

/**
 * Payload base para todas las acciones
 */
export interface TenantActionPayload {
  action: TenantAction;
  tenant_id?: number;
}

/**
 * Payload para crear tenant (email-based owner)
 */
export interface CreateTenantPayload extends TenantActionPayload {
  action: "create";
  name: string; // Required: tenant display name
  owner_email: string; // Required: owner email (primary identifier)
  owner_name?: string; // Optional: owner display name
  plan?: "basic" | "pro" | "enterprise";
  tenant_id?: number; // Optional: explicit tenant_id (will auto-generate if omitted)
  owner_user_id?: string; // Optional: explicit owner user_id (will lookup from auth.users if omitted)
}

/**
 * Payload para actualizar tenant
 */
export interface UpdateTenantPayload extends TenantActionPayload {
  action: "update";
  tenant_id: number;
  name?: string;
  plan?: "basic" | "pro" | "enterprise";
  meta?: Record<string, unknown>;
}

/**
 * Payload para pausar tenant
 */
export interface PauseTenantPayload extends TenantActionPayload {
  action: "pause";
  tenant_id: number;
  reason?: string;
}

/**
 * Payload para reanudar tenant
 */
export interface ResumeTenantPayload extends TenantActionPayload {
  action: "resume";
  tenant_id: number;
}

/**
 * Payload para listar tenants
 */
export interface ListTenantsPayload extends TenantActionPayload {
  action: "list";
  limit?: number;
  offset?: number;
  status?: "active" | "suspended" | "pending";
}

/**
 * Union type of todos los payloads posibles
 */
export type TenantManagementPayload =
  | CreateTenantPayload
  | UpdateTenantPayload
  | PauseTenantPayload
  | ResumeTenantPayload
  | ListTenantsPayload;

/**
 * Respuesta estándar de las operaciones
 */
export interface TenantOperationResult {
  success: boolean;
  action: TenantAction;
  tenant_id?: number;
  schema_name?: string;
  data?: Record<string, unknown>;
  error?: string;
  error_code?: string;
  hint?: string;
}

/**
 * Resultado del RPC create_store_tenant
 */
export interface CreateStoreTenantResult {
  tenant_id: number;
  schema_name: string;
  name: string;
  plan: string;
  created_at: string;
}