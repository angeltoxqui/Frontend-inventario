-- RPC: create_store_tenant
-- Creates/updates a tenant row in public.tenants, assigns owner in public.tenant_users,
-- creates tenant schema if missing, and records initial migration in schema_migration_history.
-- SECURITY DEFINER: should be executed only by trusted backend/Edge Functions.

CREATE OR REPLACE FUNCTION public.create_store_tenant(
  p_tenant_id bigint,
  p_name text,
  p_plan text DEFAULT 'basic',
  p_owner_user_id uuid DEFAULT NULL,
  p_admin_name text DEFAULT NULL,
  p_admin_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema_name text;
  v_result jsonb;
BEGIN
  IF p_tenant_id IS NULL OR p_tenant_id < 1 THEN
    RAISE EXCEPTION 'p_tenant_id must be >= 1';
  END IF;

  v_schema_name := 'tenant_' || lpad(p_tenant_id::text, 6, '0');

  -- Insert or update tenant metadata
  INSERT INTO public.tenants (tenant_id, name, status, plan, revenue, next_payment, created_by, updated_by, meta)
  VALUES (
    p_tenant_id,
    p_name,
    'active',
    p_plan,
    0,
    now() + interval '30 days',
    p_owner_user_id,
    p_owner_user_id,
    jsonb_build_object('adminName', p_admin_name, 'adminEmail', p_admin_email)
  )
  ON CONFLICT (tenant_id) DO UPDATE
    SET name = EXCLUDED.name,
        status = EXCLUDED.status,
        plan = EXCLUDED.plan,
        updated_at = now(),
        updated_by = EXCLUDED.updated_by,
        meta = public.tenants.meta || EXCLUDED.meta;

  -- Assign owner in public.tenant_users if provided
  IF p_owner_user_id IS NOT NULL THEN
    INSERT INTO public.tenant_users (tenant_id, user_id, role)
    VALUES (p_tenant_id, p_owner_user_id, 'owner')
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  -- Create tenant schema if not exists
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', v_schema_name);

  -- Record initial migration application in schema_migration_history
  INSERT INTO public.schema_migration_history (schema_name, migration_name, applied_by)
  VALUES (v_schema_name, 'initial_setup', p_owner_user_id)
  ON CONFLICT (schema_name, migration_name) DO NOTHING;

  v_result := jsonb_build_object(
    'tenant_id', p_tenant_id,
    'schema_name', v_schema_name,
    'name', p_name,
    'plan', p_plan,
    'created_at', now()
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- Hardening: revoke public, grant only service_role
REVOKE ALL ON FUNCTION public.create_store_tenant(bigint,text,text,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_store_tenant(bigint,text,text,uuid,text,text) TO service_role;
