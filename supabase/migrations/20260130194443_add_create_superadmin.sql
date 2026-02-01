-- RPC: create_superadmin
-- Creates a new superadmin record in public.superadmins
-- SECURITY DEFINER: execution restricted to trusted roles/functions
-- Note: This function overlaps with add_superadmin.sql but follows the new naming pattern

CREATE OR REPLACE FUNCTION public.create_superadmin(
  p_user_id uuid,
  p_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_superadmin_record public.superadmins;
  v_result jsonb;
BEGIN
  -- Validate input
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  -- Check if superadmin already exists
  SELECT * INTO v_superadmin_record 
  FROM public.superadmins 
  WHERE user_id = p_user_id;

  IF FOUND THEN
    RAISE EXCEPTION 'Superadmin with user_id % already exists', p_user_id;
  END IF;

  -- Insert new superadmin
  INSERT INTO public.superadmins (user_id, email, is_active)
  VALUES (p_user_id, p_email, true)
  RETURNING * INTO v_superadmin_record;

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
    RAISE EXCEPTION 'Failed to create superadmin: %', SQLERRM;
END;
$$;

-- Hardening: revoke public, grant only service_role
REVOKE ALL ON FUNCTION public.create_superadmin(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_superadmin(uuid, text) TO service_role;