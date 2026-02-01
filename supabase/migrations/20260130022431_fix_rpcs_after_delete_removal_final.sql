-- Fix RPC functions after delete functionality removal
-- Updates existing functions to remove deleted status validations
-- File: sql/migrations/fix_rpcs_after_delete_removal.sql

-- ============================================================================
-- UPDATE_STORE_TENANT - Remove deleted validation
-- ============================================================================
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

-- ============================================================================
-- PAUSE_STORE_TENANT - Remove deleted validation
-- ============================================================================
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

-- ============================================================================
-- RESUME_STORE_TENANT - Remove deleted validation
-- ============================================================================
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

-- ============================================================================
-- Ensure grants are correct
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.update_store_tenant TO service_role;
GRANT EXECUTE ON FUNCTION public.pause_store_tenant TO service_role;
GRANT EXECUTE ON FUNCTION public.resume_store_tenant TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_store_tenant FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.pause_store_tenant FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.resume_store_tenant FROM authenticated, anon;

-- ============================================================================
-- Update comments
-- ============================================================================
COMMENT ON FUNCTION public.update_store_tenant IS 'Updates tenant metadata (name, plan, meta) - no delete validation';
COMMENT ON FUNCTION public.pause_store_tenant IS 'Suspends a tenant (status=suspended) - no delete validation';
COMMENT ON FUNCTION public.resume_store_tenant IS 'Reactivates a suspended tenant (status=active) - no delete validation';