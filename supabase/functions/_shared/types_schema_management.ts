/**
 * Types para Schema Management Edge Function
 */

/**
 * Acciones disponibles para schema-management
 */
export type SchemaAction = "record" | "list" | "status";

/**
 * Payload base para todas las acciones de schema
 */
export interface SchemaActionPayload {
  action: SchemaAction;
}

/**
 * Payload para registrar migración
 */
export interface RecordMigrationPayload extends SchemaActionPayload {
  action: "record";
  schema_name: string;
  migration_name: string;
  checksum?: string;
  applied_by?: string;
}

/**
 * Payload para listar migraciones
 */
export interface ListMigrationsPayload extends SchemaActionPayload {
  action: "list";
  schema_name: string;
}

/**
 * Payload para estado de migraciones
 */
export interface StatusMigrationsPayload extends SchemaActionPayload {
  action: "status";
  schema_name: string;
}

/**
 * Union type de todos los payloads de schema posibles
 */
export type SchemaManagementPayload =
  | RecordMigrationPayload
  | ListMigrationsPayload
  | StatusMigrationsPayload;

/**
 * Resultado de operaciones de schema
 */
export interface SchemaOperationResult {
  success: boolean;
  action: SchemaAction;
  schema_name: string;
  data?: Record<string, unknown>;
  error?: string;
  error_code?: string;
  hint?: string;
}