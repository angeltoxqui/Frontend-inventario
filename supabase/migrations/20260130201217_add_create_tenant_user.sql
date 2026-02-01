-- RPC: create_tenant_user
-- Creates a new tenant-user mapping in public.tenant_users
-- SECURITY DEFINER: execution restricted to trusted roles/functions

CREATE OR REPLACE FUNCTION public.create_tenant_user(
  p_tenant_id bigint,
  p_user_id uuid,
  p_role text DEFAULT 'admin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_user_record public.tenant_users;
  v_result jsonb;
BEGIN
  -- Validate input
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'p_tenant_id is required';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;
  IF p_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'p_role must be either "owner" or "admin"';
  END IF;

  -- Check if tenant exists
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE tenant_id = p_tenant_id) THEN
    RAISE EXCEPTION 'Tenant with tenant_id % does not exist', p_tenant_id;
  END IF;

  -- Check if mapping already exists
  SELECT * INTO v_tenant_user_record 
  FROM public.tenant_users 
  WHERE tenant_id = p_tenant_id AND user_id = p_user_id;

  IF FOUND THEN
    RAISE EXCEPTION 'User % is already mapped to tenant %', p_user_id, p_tenant_id;
  END IF;

  -- Insert new tenant-user mapping
  INSERT INTO public.tenant_users (tenant_id, user_id, role)
  VALUES (p_tenant_id, p_user_id, p_role)
  RETURNING * INTO v_tenant_user_record;

  -- Build response
  v_result := jsonb_build_object(
    'id', v_tenant_user_record.id,
    'tenant_id', v_tenant_user_record.tenant_id,
    'user_id', v_tenant_user_record.user_id,
    'role', v_tenant_user_record.role,
    'created_at', v_tenant_user_record.created_at
  );

  RETURN v_result;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Failed to create tenant user: %', SQLERRM;
END;
$$;

-- Hardening: revoke public, grant only service_role
REVOKE ALL ON FUNCTION public.create_tenant_user(bigint, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_tenant_user(bigint, uuid, text) TO service_role;