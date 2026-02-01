/**
 * Main types module - imports and re-exports all specialized type modules
 * This provides a single entry point for all Edge Function types
 */

// Import and re-export all tenant management types
export * from "./types_tenant_management.ts";

// Import and re-export all superadmin management types
export * from "./types_superadmin_management.ts";

// Import and re-export all tenant user management types  
export * from "./types_tenant_user_management.ts";

// Import and re-export all schema management types
export * from "./types_schema_management.ts";

// Import and re-export all POS management types
export * from "./types_product_management.ts";
export * from "./types_ingredient_management.ts";
export * from "./types_table_management.ts";
export * from "./types_order_management.ts";

/**
 * Helper para crear respuestas JSON
 */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Helper para respuestas de error
 */
export function errorResponse(
  error: string,
  message?: string,
  status = 400
): Response {
  return jsonResponse({ error, message }, status);
}

/**
 * Helper avanzado para errores estructurados con códigos
 */
export function structuredErrorResponse(
  code: string,
  hint: string = "",
  status: number = 500
): Response {
  return jsonResponse(
    {
      success: false,
      error_code: code,
      error_hint: hint,
      timestamp: new Date().toISOString(),
    },
    status
  );
}
