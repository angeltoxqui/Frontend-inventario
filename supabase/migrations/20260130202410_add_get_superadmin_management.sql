-- RPC: get_superadmins
-- Lists all superadmin records from public.superadmins
-- SECURITY DEFINER: execution restricted to trusted roles/functions

CREATE OR REPLACE FUNCTION public.get_superadmins()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_superadmins jsonb := '[]'::jsonb;
  r public.superadmins;
BEGIN
  -- Get all superadmins
  FOR r IN 
    SELECT * FROM public.superadmins 
    ORDER BY created_at ASC
  LOOP
    v_superadmins := v_superadmins || jsonb_build_object(
      'id', r.id,
      'user_id', r.user_id,
      'email', r.email,
      'is_active', r.is_active,
      'created_at', r.created_at,
      'updated_at', r.updated_at
    );
  END LOOP;

  -- Build response
  v_result := jsonb_build_object(
    'superadmins', v_superadmins,
    'count', jsonb_array_length(v_superadmins),
    'active_count', (
      SELECT COUNT(*) 
      FROM public.superadmins 
      WHERE is_active = true
    )
  );

  RETURN v_result;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Failed to get superadmins: %', SQLERRM;
END;
$$;

-- Hardening: revoke public, grant only service_role
REVOKE ALL ON FUNCTION public.get_superadmins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_superadmins() TO service_role;