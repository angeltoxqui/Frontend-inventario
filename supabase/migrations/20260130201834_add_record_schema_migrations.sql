-- RPC: record_schema_migration
-- Records a schema migration in public.schema_migration_history
-- SECURITY DEFINER: execution restricted to trusted roles/functions

CREATE OR REPLACE FUNCTION public.record_schema_migration(
  p_schema_name text,
  p_migration_name text,
  p_checksum text DEFAULT NULL,
  p_applied_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_migration_record public.schema_migration_history;
  v_result jsonb;
BEGIN
  -- Validate input
  IF p_schema_name IS NULL OR p_schema_name = '' THEN
    RAISE EXCEPTION 'p_schema_name is required';
  END IF;
  IF p_migration_name IS NULL OR p_migration_name = '' THEN
    RAISE EXCEPTION 'p_migration_name is required';
  END IF;

  -- Check if migration already recorded
  SELECT * INTO v_migration_record 
  FROM public.schema_migration_history 
  WHERE schema_name = p_schema_name AND migration_name = p_migration_name;

  IF FOUND THEN
    RAISE EXCEPTION 'Migration % already recorded for schema %', p_migration_name, p_schema_name;
  END IF;

  -- Insert migration record
  INSERT INTO public.schema_migration_history (schema_name, migration_name, checksum, applied_by)
  VALUES (p_schema_name, p_migration_name, p_checksum, p_applied_by)
  RETURNING * INTO v_migration_record;

  -- Build response
  v_result := jsonb_build_object(
    'id', v_migration_record.id,
    'schema_name', v_migration_record.schema_name,
    'migration_name', v_migration_record.migration_name,
    'checksum', v_migration_record.checksum,
    'applied_at', v_migration_record.applied_at,
    'applied_by', v_migration_record.applied_by
  );

  RETURN v_result;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Failed to record schema migration: %', SQLERRM;
END;
$$;

-- Hardening: revoke public, grant only service_role
REVOKE ALL ON FUNCTION public.record_schema_migration(text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_schema_migration(text, text, text, uuid) TO service_role;