-- RPC: update_superadmin
-- Updates email and/or active status of existing superadmin
-- SECURITY DEFINER: execution restricted to trusted roles/functions

CREATE OR REPLACE FUNCTION public.update_superadmin(
  p_user_id uuid,
  p_email text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_superadmin_record public.superadmins;
  v_result jsonb;
  v_updated_rows integer;
BEGIN
  -- Validate input
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  -- Check if superadmin exists
  SELECT * INTO v_superadmin_record 
  FROM public.superadmins 
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Superadmin with user_id % does not exist', p_user_id;
  END IF;

  -- Update only provided fields
  UPDATE public.superadmins 
  SET 
    email = COALESCE(p_email, email),
    is_active = COALESCE(p_is_active, is_active)
  WHERE user_id = p_user_id
  RETURNING * INTO v_superadmin_record;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    RAISE EXCEPTION 'No changes were made to superadmin %', p_user_id;
  END IF;

  -- Build response
  v_result := jsonb_build_object(
    'id', v_superadmin_record.id,
    'user_id', v_superadmin_record.user_id,
    'email', v_superadmin_record.email,
    'is_active', v_superadmin_record.is_active,
    'created_at', v_superadmin_record.created_at
  );

  RETURN v_result;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Failed to update superadmin: %', SQLERRM;
END;
$$;

-- Hardening: revoke public, grant only service_role
REVOKE ALL ON FUNCTION public.update_superadmin(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_superadmin(uuid, text, boolean) TO service_role;