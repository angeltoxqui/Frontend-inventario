-- RPC: delete_store_tenant
-- Deletes a tenant (soft-delete by default, hard-delete optional) in public.tenants
-- SECURITY DEFINER: should be executed only by trusted backend/Edge Functions.

CREATE OR REPLACE FUNCTION public.delete_store_tenant(
  p_tenant_id bigint,
  p_hard_delete boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_schema_name text;
  v_current_status text;
  v_tenant_record record;
BEGIN
  -- Obtener datos actuales
  SELECT t.schema_name, t.status, t.name, t.plan
  INTO v_schema_name, v_current_status, v_tenant_record.name, v_tenant_record.plan
  FROM public.tenants t
  WHERE t.tenant_id = p_tenant_id;

  IF v_schema_name IS NULL THEN
    RAISE EXCEPTION 'Tenant % does not exist', p_tenant_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_current_status = 'deleted' AND NOT p_hard_delete THEN
    RAISE EXCEPTION 'Tenant % is already deleted', p_tenant_id
      USING ERRCODE = 'P0004';
  END IF;

  IF p_hard_delete THEN
    -- HARD DELETE: Eliminar schema y registro
    -- ⚠️ IRREVERSIBLE - usar con cuidado
    
    -- Eliminar schema del tenant (CASCADE elimina todas las tablas)
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', v_schema_name);
    
    -- Eliminar registros relacionados
    DELETE FROM public.tenant_users tu WHERE tu.tenant_id = p_tenant_id;
    DELETE FROM public.schema_migration_history smh WHERE smh.schema_name = v_schema_name;
    DELETE FROM public.tenants t WHERE t.tenant_id = p_tenant_id;
    
    -- Construir respuesta JSON para hard delete
    v_result := jsonb_build_object(
      'tenant_id', p_tenant_id,
      'schema_name', v_schema_name,
      'action', 'hard_delete',
      'deleted_at', now(),
      'name', v_tenant_record.name,
      'plan', v_tenant_record.plan
    );
  ELSE
    -- SOFT DELETE: Solo marcar como eliminado
    UPDATE public.tenants t
    SET
      status = 'deleted',
      meta = COALESCE(t.meta, '{}'::jsonb) || 
             jsonb_build_object(
               'deleted_at', now()::text, 
               'deleted_by', 'api'
             ),
      updated_at = now()
    WHERE t.tenant_id = p_tenant_id;
    
    -- Obtener datos actualizados para soft delete
    SELECT tenant_id, name, plan, status, schema_name, meta, updated_at
    INTO v_tenant_record
    FROM public.tenants t
    WHERE t.tenant_id = p_tenant_id;
    
    -- Construir respuesta JSON para soft delete
    v_result := jsonb_build_object(
      'tenant_id', v_tenant_record.tenant_id,
      'name', v_tenant_record.name,
      'status', v_tenant_record.status,
      'schema_name', v_tenant_record.schema_name,
      'action', 'soft_delete',
      'deleted_at', now(),
      'meta', v_tenant_record.meta
    );
  END IF;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- Hardening: revoke public, grant only service_role
REVOKE ALL ON FUNCTION public.delete_store_tenant(bigint,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_store_tenant(bigint,boolean) TO service_role;

COMMENT ON FUNCTION public.delete_store_tenant IS 
'Deletes tenant. Soft-delete by default (status=deleted), hard-delete removes schema and records.';