-- RPC: get_schema_migrations
-- Lists all migration records for a specific schema
-- SECURITY DEFINER: execution restricted to trusted roles/functions

CREATE OR REPLACE FUNCTION public.get_schema_migrations(
  p_schema_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_migrations jsonb := '[]'::jsonb;
  r public.schema_migration_history;
BEGIN
  -- Validate input
  IF p_schema_name IS NULL OR p_schema_name = '' THEN
    RAISE EXCEPTION 'p_schema_name is required';
  END IF;

  -- Get all migrations for this schema
  FOR r IN 
    SELECT * FROM public.schema_migration_history 
    WHERE schema_name = p_schema_name 
    ORDER BY applied_at ASC
  LOOP
    v_migrations := v_migrations || jsonb_build_object(
      'id', r.id,
      'schema_name', r.schema_name,
      'migration_name', r.migration_name,
      'checksum', r.checksum,
      'applied_at', r.applied_at,
      'applied_by', r.applied_by
    );
  END LOOP;

  -- Build response
  v_result := jsonb_build_object(
    'schema_name', p_schema_name,
    'migrations', v_migrations,
    'count', jsonb_array_length(v_migrations)
  );

  RETURN v_result;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Failed to get schema migrations: %', SQLERRM;
END;
$$;

-- Hardening: revoke public, grant only service_role
REVOKE ALL ON FUNCTION public.get_schema_migrations(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_schema_migrations(text) TO service_role;