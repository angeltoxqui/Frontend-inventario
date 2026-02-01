// _shared/supabase-client.ts
// Cliente Supabase reutilizable para Edge Functions
// Usa service_role para operaciones privilegiadas (nunca exponer al cliente)
// import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";


// Variables de entorno (soporta local y producción)
const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("SB_LOCAL_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SB_LOCAL_SECRET_KEY");

// Validar configuración al importar
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

/**
 * Cliente Supabase con service_role (privilegios elevados)
 * Usar solo en Edge Functions del backend, nunca exponer al cliente
 */
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl || "",
  serviceRoleKey || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Obtener URL base de Supabase (útil para llamadas RPC directas)
 */
export function getSupabaseUrl(): string {
  return supabaseUrl?.replace(/\/$/, "") || "";
}

/**
 * Obtener service role key (usar con cuidado)
 */
export function getServiceRoleKey(): string {
  return serviceRoleKey || "";
}

/**
 * Helper para llamar RPCs via PostgREST
 * @param rpcName Nombre de la función RPC
 * @param payload Parámetros de la función
 */
export async function callRpc<T = unknown>(
  rpcName: string,
  payload: Record<string, unknown>
): Promise<{ data: T | null; error: string | null; status: number }> {
  const url = `${getSupabaseUrl()}/rest/v1/rpc/${rpcName}`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "apikey": getServiceRoleKey(),
        "Authorization": `Bearer ${getServiceRoleKey()}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    const contentType = response.headers.get("content-type") || "";
    
    if (!response.ok) {
      const errorData = contentType.includes("application/json") 
        ? JSON.parse(text) 
        : { message: text };
      return { 
        data: null, 
        error: errorData.message || errorData.error || text,
        status: response.status 
      };
    }

    const data = contentType.includes("application/json") ? JSON.parse(text) : text;
    return { data: data as T, error: null, status: response.status };
  } catch (err) {
    return { data: null, error: String(err), status: 500 };
  }
}
