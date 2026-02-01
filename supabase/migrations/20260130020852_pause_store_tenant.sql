-- RPC: pause_store_tenant
-- Suspends a tenant (status = 'suspended') in public.tenants
-- SECURITY DEFINER: should be executed only by trusted backend/Edge Functions.

CREATE OR REPLACE FUNCTION public.pause_store_tenant(
  p_tenant_id bigint,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_current_status text;
  v_tenant_record record;
BEGIN
  -- Obtener estado actual
  SELECT t.status INTO v_current_status
  FROM public.tenants t
  WHERE t.tenant_id = p_tenant_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Tenant % does not exist', p_tenant_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_current_status = 'suspended' THEN
    RAISE EXCEPTION 'Tenant % is already suspended', p_tenant_id
      USING ERRCODE = 'P0004';
  END IF;

  -- Suspender
  UPDATE public.tenants t
  SET
    status = 'suspended',
    meta = COALESCE(t.meta, '{}'::jsonb) || 
           jsonb_build_object(
             'suspended_at', now()::text, 
             'suspend_reason', COALESCE(p_reason, 'manual')
           ),
    updated_at = now()
  WHERE t.tenant_id = p_tenant_id;

  -- Obtener datos actualizados
  SELECT tenant_id, name, plan, status, schema_name, meta, updated_at
  INTO v_tenant_record
  FROM public.tenants t
  WHERE t.tenant_id = p_tenant_id;

  -- Construir respuesta JSON
  v_result := jsonb_build_object(
    'tenant_id', v_tenant_record.tenant_id,
    'name', v_tenant_record.name,
    'status', v_tenant_record.status,
    'schema_name', v_tenant_record.schema_name,
    'paused_at', now(),
    'reason', COALESCE(p_reason, 'manual'),
    'meta', v_tenant_record.meta
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- Hardening: revoke public, grant only service_role
REVOKE ALL ON FUNCTION public.pause_store_tenant(bigint,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pause_store_tenant(bigint,text) TO service_role;

COMMENT ON FUNCTION public.pause_store_tenant IS 
'Suspends a tenant (status=suspended). Stores reason and timestamp in meta.';