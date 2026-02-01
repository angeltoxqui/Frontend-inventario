// Edge Function: provisioning
// Recibe POST con payload { tenant_id: number, name?: string, owner_user_id?: string }
// Valida entrada mínima y reenvía la llamada al RPC Postgres `create_store_tenant`
// usando la service role key del servidor (no exponerla al cliente).

const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("SB_LOCAL_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SB_LOCAL_SECRET_KEY");

// Helper para respuestas JSON con cabeceras apropiadas
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async (req: Request) => {
  // Solo aceptamos POST
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  // Verificar configuración mínima (soporte local con SB_LOCAL_*)
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "service_unavailable", message: "Missing SUPABASE_URL or service role key" }, 503);
  }

  // Parsear body JSON
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch (err) {
    return jsonResponse({ error: "invalid_json", message: String(err) }, 400);
  }

  // Validación mínima: tenant_id debe ser numérico
  const tenantId = payload && payload.tenant_id;
  if (typeof tenantId !== "number") {
    return jsonResponse({ error: "invalid_payload", message: "tenant_id must be numeric" }, 400);
  }

  // Llamada al RPC PostgREST
  try {
    const rpcUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/create_store_tenant`;
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    const contentType = response.headers.get("content-type") || "";
    const rpcResult = contentType.includes("application/json") ? JSON.parse(text) : { raw: text };

    return new Response(JSON.stringify({ status: response.status, result: rpcResult }), {
      status: response.status,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    // Error de comunicación con la RPC
    return jsonResponse({ error: "rpc_call_failed", message: String(err) }, 500);
  }
};
