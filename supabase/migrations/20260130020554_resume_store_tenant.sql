-- RPC: resume_store_tenant
-- Reactivates a suspended tenant (status = 'active') in public.tenants
-- SECURITY DEFINER: should be executed only by trusted backend/Edge Functions.

CREATE OR REPLACE FUNCTION public.resume_store_tenant(
  p_tenant_id bigint
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

  IF v_current_status = 'active' THEN
    RAISE EXCEPTION 'Tenant % is already active', p_tenant_id
      USING ERRCODE = 'P0004';
  END IF;

  -- Reactivar
  UPDATE public.tenants t
  SET
    status = 'active',
    meta = COALESCE(t.meta, '{}'::jsonb) || 
           jsonb_build_object('resumed_at', now()::text),
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
    'resumed_at', now(),
    'meta', v_tenant_record.meta
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- Hardening: revoke public, grant only service_role
REVOKE ALL ON FUNCTION public.resume_store_tenant(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resume_store_tenant(bigint) TO service_role;

COMMENT ON FUNCTION public.resume_store_tenant IS 
'Reactivates a suspended tenant (status=active). Stores timestamp in meta.';