-- RPC: resume_superadmin
-- Reactivates a superadmin by setting is_active = true
-- SECURITY DEFINER: execution restricted to trusted roles/functions

CREATE OR REPLACE FUNCTION public.resume_superadmin(
  p_user_id uuid
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

  -- Get current state
  SELECT * INTO v_superadmin_record 
  FROM public.superadmins 
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Superadmin with user_id % does not exist', p_user_id;
  END IF;

  -- Check if already active
  IF v_superadmin_record.is_active = true THEN
    RAISE EXCEPTION 'Superadmin % is already active', p_user_id;
  END IF;

  -- Resume superadmin
  UPDATE public.superadmins 
  SET is_active = true
  WHERE user_id = p_user_id
  RETURNING * INTO v_superadmin_record;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    RAISE EXCEPTION 'Failed to resume superadmin %', p_user_id;
  END IF;

  -- Build response
  v_result := jsonb_build_object(
    'id', v_superadmin_record.id,
    'user_id', v_superadmin_record.user_id,
    'email', v_superadmin_record.email,
    'is_active', v_superadmin_record.is_active,
    'created_at', v_superadmin_record.created_at,
    'action', 'resumed'
  );

  RETURN v_result;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Failed to resume superadmin: %', SQLERRM;
END;
$$;

-- Hardening: revoke public, grant only service_role
REVOKE ALL ON FUNCTION public.resume_superadmin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resume_superadmin(uuid) TO service_role;