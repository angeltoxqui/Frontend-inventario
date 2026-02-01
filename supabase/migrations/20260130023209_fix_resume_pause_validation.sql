-- Fix resume_store_tenant function validation logic
-- Issue: incorrect status validation causing "already active" error

-- ============================================================================
-- RESUME_STORE_TENANT - Fix validation logic with proper SELECT
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
  -- First, SELECT to get current status
  SELECT t.status INTO v_current_status
  FROM public.tenants t
  WHERE t.tenant_id = p_tenant_id;

  -- Validate tenant exists
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Tenant % does not exist', p_tenant_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Validate current status
  IF v_current_status = 'active' THEN
    RAISE EXCEPTION 'Tenant % is already active', p_tenant_id
      USING ERRCODE = 'P0004';
  END IF;

  IF v_current_status != 'suspended' THEN
    RAISE EXCEPTION 'Tenant % must be suspended to resume (current: %)', p_tenant_id, v_current_status
      USING ERRCODE = 'P0005';
  END IF;

  -- Reactivate (only if suspended)
  UPDATE public.tenants t
  SET
    status = 'active',
    meta = COALESCE(t.meta, '{}'::jsonb) || 
           jsonb_build_object('resumed_at', now()::text),
    updated_at = now()
  WHERE t.tenant_id = p_tenant_id 
    AND t.status = 'suspended'; -- Extra safety check

  -- Verify update occurred
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to resume tenant %. Check current status.', p_tenant_id
      USING ERRCODE = 'P0006';
  END IF;

  -- Get updated data with SELECT
  SELECT tenant_id, name, plan, status, schema_name, meta, updated_at
  INTO v_tenant_record
  FROM public.tenants t
  WHERE t.tenant_id = p_tenant_id;

  -- Build JSON response
  v_result := jsonb_build_object(
    'tenant_id', v_tenant_record.tenant_id,
    'name', v_tenant_record.name,
    'plan', v_tenant_record.plan,
    'status', v_tenant_record.status,
    'schema_name', v_tenant_record.schema_name,
    'resumed_at', now(),
    'previous_status', 'suspended',
    'meta', v_tenant_record.meta
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ============================================================================
-- PAUSE_STORE_TENANT - Also fix for consistency
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
  -- First, SELECT to get current status
  SELECT t.status INTO v_current_status
  FROM public.tenants t
  WHERE t.tenant_id = p_tenant_id;

  -- Validate tenant exists
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Tenant % does not exist', p_tenant_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Validate current status
  IF v_current_status = 'suspended' THEN
    RAISE EXCEPTION 'Tenant % is already suspended', p_tenant_id
      USING ERRCODE = 'P0004';
  END IF;

  IF v_current_status != 'active' THEN
    RAISE EXCEPTION 'Tenant % must be active to pause (current: %)', p_tenant_id, v_current_status
      USING ERRCODE = 'P0005';
  END IF;

  -- Suspend (only if active)
  UPDATE public.tenants t
  SET
    status = 'suspended',
    meta = COALESCE(t.meta, '{}'::jsonb) || 
           jsonb_build_object(
             'suspended_at', now()::text, 
             'suspend_reason', COALESCE(p_reason, 'manual')
           ),
    updated_at = now()
  WHERE t.tenant_id = p_tenant_id 
    AND t.status = 'active'; -- Extra safety check

  -- Verify update occurred
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to pause tenant %. Check current status.', p_tenant_id
      USING ERRCODE = 'P0006';
  END IF;

  -- Get updated data with SELECT
  SELECT tenant_id, name, plan, status, schema_name, meta, updated_at
  INTO v_tenant_record
  FROM public.tenants t
  WHERE t.tenant_id = p_tenant_id;

  -- Build JSON response
  v_result := jsonb_build_object(
    'tenant_id', v_tenant_record.tenant_id,
    'name', v_tenant_record.name,
    'plan', v_tenant_record.plan,
    'status', v_tenant_record.status,
    'schema_name', v_tenant_record.schema_name,
    'paused_at', now(),
    'reason', COALESCE(p_reason, 'manual'),
    'previous_status', 'active',
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
GRANT EXECUTE ON FUNCTION public.resume_store_tenant TO service_role;
GRANT EXECUTE ON FUNCTION public.pause_store_tenant TO service_role;

REVOKE EXECUTE ON FUNCTION public.resume_store_tenant FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.pause_store_tenant FROM authenticated, anon;

-- ============================================================================
-- Update comments
-- ============================================================================
COMMENT ON FUNCTION public.resume_store_tenant IS 'Reactivates a suspended tenant with proper validation and SELECT checks';
COMMENT ON FUNCTION public.pause_store_tenant IS 'Suspends an active tenant with proper validation and SELECT checks';