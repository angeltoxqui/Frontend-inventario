-- RPC: update_store_tenant
-- Updates tenant metadata (name, plan, meta) in public.tenants
-- SECURITY DEFINER: should be executed only by trusted backend/Edge Functions.

CREATE OR REPLACE FUNCTION public.update_store_tenant(
  p_tenant_id bigint,
  p_name text DEFAULT NULL,
  p_plan text DEFAULT NULL,
  p_meta jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_tenant_record record;
BEGIN
  -- Validar que existe el tenant
  IF NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.tenant_id = p_tenant_id) THEN
    RAISE EXCEPTION 'Tenant % does not exist', p_tenant_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Validar que no está suspendido permanentemente
  IF EXISTS (SELECT 1 FROM public.tenants t WHERE t.tenant_id = p_tenant_id AND t.status = 'suspended') THEN
    RAISE EXCEPTION 'Cannot update suspended tenant %. Resume first.', p_tenant_id
      USING ERRCODE = 'P0003';
  END IF;

  -- Actualizar solo campos proporcionados (COALESCE mantiene valor actual si NULL)
  UPDATE public.tenants t
  SET
    name = COALESCE(p_name, t.name),
    plan = COALESCE(p_plan, t.plan),
    meta = COALESCE(p_meta, t.meta),
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
    'plan', v_tenant_record.plan,
    'status', v_tenant_record.status,
    'schema_name', v_tenant_record.schema_name,
    'meta', v_tenant_record.meta,
    'updated_at', v_tenant_record.updated_at
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- Hardening: revoke public, grant only service_role
REVOKE ALL ON FUNCTION public.update_store_tenant(bigint,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_store_tenant(bigint,text,text,jsonb) TO service_role;

COMMENT ON FUNCTION public.update_store_tenant IS 
'Updates tenant metadata (name, plan, meta). Returns JSON response like create_store_tenant.';