-- Triggers for public.tenants
-- These triggers rely on the helper functions defined in sql/tables/functions.sql

-- Trigger: update 'updated_at' timestamp on updates
-- Create trigger only if table and function exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'tenants' AND n.nspname = 'public')
     AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    PERFORM (
      'DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;'
    );
    EXECUTE 'CREATE TRIGGER update_tenants_updated_at
      BEFORE UPDATE ON public.tenants
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();';
  END IF;
END$$;

-- Trigger: prevent mutation of tenant core identity fields
-- Create immutability trigger only if table and function exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'tenants' AND n.nspname = 'public')
     AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'tenants_block_schema_mutation') THEN
    PERFORM ('DROP TRIGGER IF EXISTS tenants_immutable_core_fields ON public.tenants;');
    EXECUTE 'CREATE TRIGGER tenants_immutable_core_fields
      BEFORE UPDATE ON public.tenants
      FOR EACH ROW EXECUTE FUNCTION public.tenants_block_schema_mutation();';
  END IF;
END$$;
