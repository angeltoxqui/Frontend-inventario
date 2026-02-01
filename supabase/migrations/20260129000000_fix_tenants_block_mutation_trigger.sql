-- Fix: Remove schema_name check from tenants_block_schema_mutation()
-- Reason: schema_name is GENERATED ALWAYS AS (computed from tenant_id)
-- Postgres already prevents manual updates to GENERATED columns
-- Checking tenant_id is sufficient to protect schema_name

CREATE OR REPLACE FUNCTION public.tenants_block_schema_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only check tenant_id (schema_name is derived from it and already protected by GENERATED)
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'tenant_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

-- No need to recreate trigger, function is updated in place
