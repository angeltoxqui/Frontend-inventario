-- RPC: update_tenant_user
-- Updates role of existing tenant-user mapping in public.tenant_users
-- SECURITY DEFINER: execution restricted to trusted roles/functions

CREATE OR REPLACE FUNCTION public.update_tenant_user(
  p_tenant_id bigint,
  p_user_id uuid,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_user_record public.tenant_users;
  v_result jsonb;
  v_updated_rows integer;
BEGIN
  -- Validate input
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'p_tenant_id is required';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'p_role must be either "owner" or "admin"';
  END IF;

  -- Check if mapping exists
  SELECT * INTO v_tenant_user_record 
  FROM public.tenant_users 
  WHERE tenant_id = p_tenant_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % is not mapped to tenant %', p_user_id, p_tenant_id;
  END IF;

  -- Update role
  UPDATE public.tenant_users 
  SET role = p_role
  WHERE tenant_id = p_tenant_id AND user_id = p_user_id
  RETURNING * INTO v_tenant_user_record;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    RAISE EXCEPTION 'No changes were made to tenant user mapping';
  END IF;

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
    RAISE EXCEPTION 'Failed to update tenant user: %', SQLERRM;
END;
$$;

-- Hardening: revoke public, grant only service_role
REVOKE ALL ON FUNCTION public.update_tenant_user(bigint, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_tenant_user(bigint, uuid, text) TO service_role;