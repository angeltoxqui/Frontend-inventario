-- RPC: get_tenant_users
-- Lists all user mappings for a specific tenant
-- SECURITY DEFINER: execution restricted to trusted roles/functions

CREATE OR REPLACE FUNCTION public.get_tenant_users(
  p_tenant_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_users jsonb := '[]'::jsonb;
  r public.tenant_users;
BEGIN
  -- Validate input
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'p_tenant_id is required';
  END IF;

  -- Check if tenant exists
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE tenant_id = p_tenant_id) THEN
    RAISE EXCEPTION 'Tenant with tenant_id % does not exist', p_tenant_id;
  END IF;

  -- Get all users for this tenant
  FOR r IN 
    SELECT * FROM public.tenant_users 
    WHERE tenant_id = p_tenant_id 
    ORDER BY created_at ASC
  LOOP
    v_users := v_users || jsonb_build_object(
      'id', r.id,
      'tenant_id', r.tenant_id,
      'user_id', r.user_id,
      'role', r.role,
      'created_at', r.created_at
    );
  END LOOP;

  -- Build response
  v_result := jsonb_build_object(
    'tenant_id', p_tenant_id,
    'users', v_users,
    'count', jsonb_array_length(v_users)
  );

  RETURN v_result;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Failed to get tenant users: %', SQLERRM;
END;
$$;

-- Hardening: revoke public, grant only service_role
REVOKE ALL ON FUNCTION public.get_tenant_users(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_users(bigint) TO service_role;