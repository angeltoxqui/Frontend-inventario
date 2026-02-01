-- RPC: add_superadmin
-- Adds or re-activates a superadmin record in public.superadmins.
-- SECURITY DEFINER: execution restricted to trusted roles/functions.

CREATE OR REPLACE FUNCTION public.add_superadmin(
  p_user_id uuid,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  INSERT INTO public.superadmins (user_id, email, is_active)
  VALUES (p_user_id, p_email, true)
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, is_active = true;

  v_result := jsonb_build_object('user_id', p_user_id, 'email', p_email, 'is_active', true);
  RETURN v_result;
END;
$$;

-- Hardening: revoke public, grant only service_role
REVOKE ALL ON FUNCTION public.add_superadmin(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_superadmin(uuid,text) TO service_role;
