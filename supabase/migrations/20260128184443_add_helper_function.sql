-- Functions: Auditing and immutability helpers
-- Purpose: Reusable triggers for audit fields and data protection
-- Related: All tables with updated_at fields, specifically tenants.sql

-- Generic trigger function for updating 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Specific trigger function to prevent mutation of tenant core identity fields
CREATE OR REPLACE FUNCTION public.tenants_block_schema_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'tenant_id is immutable';
  END IF;
  IF NEW.schema_name IS DISTINCT FROM OLD.schema_name THEN
    RAISE EXCEPTION 'schema_name is immutable';
  END IF;
  RETURN NEW;
END;
$$;

-- Usage examples:
-- CREATE TRIGGER update_tenants_updated_at
--   BEFORE UPDATE ON public.tenants
--   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--
-- CREATE TRIGGER tenants_immutable_core_fields
--   BEFORE UPDATE ON public.tenants
--   FOR EACH ROW EXECUTE FUNCTION public.tenants_block_schema_mutation();