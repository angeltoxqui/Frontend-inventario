-- Migration: fix_rcps.sql
-- Purpose: Update RPC functions to support email-based user management
-- Date: 2026-01-30
-- Author: System Refactor
-- 
-- Changes:
-- 1. Update create_superadmin to accept email (auto-generate user_id if needed)
-- 2. Update create_store_tenant to accept owner_email (sync user_id and tenant_id)
-- 3. Update create_tenant_user to accept email and name
-- 4. Update get_* functions to include name and email in responses
--
-- Note: These are DROP/CREATE operations to replace existing functions

-- ============================================================================
-- 1. RPC: create_superadmin (email-based)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_superadmin(
  p_email text,
  p_name text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_superadmin_record public.superadmins;
  v_resolved_user_id uuid;
  v_result jsonb;
BEGIN
  -- Validate email format
  IF NOT public.is_valid_email(p_email) THEN
    RAISE EXCEPTION 'Invalid email format: %', p_email;
  END IF;

  -- Resolve user_id: provided explicitly or lookup from auth.users
  IF p_user_id IS NOT NULL THEN
    v_resolved_user_id := p_user_id;
  ELSE
    -- Lookup in auth.users by email
    BEGIN
      v_resolved_user_id := public.get_user_id_by_email(p_email);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Cannot create superadmin: user with email % not found in auth.users. User must be registered first.', p_email;
    END;
  END IF;

  -- Check if superadmin already exists
  SELECT * INTO v_superadmin_record 
  FROM public.superadmins 
  WHERE user_id = v_resolved_user_id OR email = p_email;

  IF FOUND THEN
    RAISE EXCEPTION 'Superadmin with email % or user_id % already exists', p_email, v_resolved_user_id;
  END IF;

  -- Insert new superadmin
  INSERT INTO public.superadmins (user_id, email, name, is_active)
  VALUES (v_resolved_user_id, p_email, p_name, true)
  RETURNING * INTO v_superadmin_record;

  -- Build response
  v_result := jsonb_build_object(
    'id', v_superadmin_record.id,
    'user_id', v_superadmin_record.user_id,
    'email', v_superadmin_record.email,
    'name', v_superadmin_record.name,
    'is_active', v_superadmin_record.is_active,
    'created_at', v_superadmin_record.created_at
  );

  RETURN v_result;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Failed to create superadmin: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.create_superadmin(text, text, uuid) IS 
'Creates superadmin by email. Looks up user_id from auth.users or accepts explicit user_id.';

REVOKE ALL ON FUNCTION public.create_superadmin(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_superadmin(text, text, uuid) TO service_role;

-- ============================================================================
-- 2. RPC: create_store_tenant (email-based with ID sync)
-- ============================================================================
-- 
-- WORKFLOW: Super Admin creates tenant for existing user
-- 1. User registers in auth.users (gets user_id)
-- 2. Super Admin calls this RPC with user's email
-- 3. This RPC creates both tenant AND assigns owner in one transaction
--
-- IMPORTANT: This is the main function for tenant creation from super admin
-- Do NOT use create_tenant_user for initial tenant creation - it validates tenant exists

CREATE OR REPLACE FUNCTION public.create_store_tenant(
  p_name text,
  p_owner_email text,
  p_owner_name text DEFAULT NULL,
  p_plan text DEFAULT 'basic',
  p_tenant_id bigint DEFAULT NULL,
  p_owner_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema_name text;
  v_resolved_user_id uuid;
  v_resolved_tenant_id bigint;
  v_result jsonb;
BEGIN
  -- Validate inputs
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'p_name is required';
  END IF;

  IF NOT public.is_valid_email(p_owner_email) THEN
    RAISE EXCEPTION 'Invalid owner email format: %', p_owner_email;
  END IF;

  -- Resolve owner user_id: provided explicitly or lookup from auth.users
  IF p_owner_user_id IS NOT NULL THEN
    v_resolved_user_id := p_owner_user_id;
  ELSE
    -- Lookup in auth.users by email
    BEGIN
      v_resolved_user_id := public.get_user_id_by_email(p_owner_email);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Cannot create tenant: owner with email % not found in auth.users. Owner must be registered first.', p_owner_email;
    END;
  END IF;

  -- Auto-generate tenant_id if not provided
  -- Strategy: Use sequential numbering for tenants
  IF p_tenant_id IS NOT NULL THEN
    v_resolved_tenant_id := p_tenant_id;
    
    -- Validate that tenant_id is not already taken
    IF EXISTS (SELECT 1 FROM public.tenants WHERE tenant_id = v_resolved_tenant_id) THEN
      RAISE EXCEPTION 'Tenant with tenant_id % already exists', v_resolved_tenant_id;
    END IF;
  ELSE
    -- Generate next available tenant_id from sequence
    SELECT COALESCE(MAX(tenant_id), 0) + 1 INTO v_resolved_tenant_id
    FROM public.tenants;
  END IF;

  -- Validate tenant_id
  IF v_resolved_tenant_id IS NULL OR v_resolved_tenant_id < 1 THEN
    RAISE EXCEPTION 'Invalid tenant_id: must be >= 1';
  END IF;

  v_schema_name := 'tenant_' || lpad(v_resolved_tenant_id::text, 6, '0');

  -- Insert tenant metadata (this creates the tenant first)
  INSERT INTO public.tenants (tenant_id, name, status, plan, revenue, next_payment, created_by, updated_by, meta)
  VALUES (
    v_resolved_tenant_id,
    p_name,
    'active',
    p_plan,
    0,
    now() + interval '30 days',
    v_resolved_user_id,
    v_resolved_user_id,
    jsonb_build_object('adminName', p_owner_name, 'adminEmail', p_owner_email)
  );

  -- Create the tenant schema and apply template
  BEGIN
    PERFORM public.apply_tenant_template(v_schema_name);
  EXCEPTION WHEN OTHERS THEN
    -- Rollback: delete the tenant record if schema creation fails
    DELETE FROM public.tenants WHERE tenant_id = v_resolved_tenant_id;
    RAISE EXCEPTION 'Failed to create tenant schema: %', SQLERRM;
  END;

  -- Now assign owner in public.tenant_users (after tenant exists)
  INSERT INTO public.tenant_users (tenant_id, user_id, email, name, role, status, created_by, updated_by)
  VALUES (v_resolved_tenant_id, v_resolved_user_id, p_owner_email, p_owner_name, 'owner', 'active', v_resolved_user_id, v_resolved_user_id)
  ON CONFLICT (tenant_id, user_id) DO UPDATE 
    SET role = EXCLUDED.role,
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        updated_at = now(),
        updated_by = EXCLUDED.updated_by;

  -- Record initial migration application in schema_migration_history
  INSERT INTO public.schema_migration_history (schema_name, migration_name, applied_by)
  VALUES (v_schema_name, 'initial_setup', v_resolved_user_id)
  ON CONFLICT (schema_name, migration_name) DO NOTHING;

  v_result := jsonb_build_object(
    'tenant_id', v_resolved_tenant_id,
    'schema_name', v_schema_name,
    'name', p_name,
    'plan', p_plan,
    'owner_email', p_owner_email,
    'owner_name', p_owner_name,
    'owner_user_id', v_resolved_user_id,
    'created_at', now()
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

COMMENT ON FUNCTION public.create_store_tenant(text, text, text, text, bigint, uuid) IS 
'Creates tenant by owner email. Auto-generates tenant_id and resolves user_id from auth.users.';

REVOKE ALL ON FUNCTION public.create_store_tenant(text, text, text, text, bigint, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_store_tenant(text, text, text, text, bigint, uuid) TO service_role;

-- ============================================================================
-- 3. RPC: create_tenant_user (email-based, tenant_id optional)
-- ============================================================================
--
-- WORKFLOW: Register user or add to EXISTING tenant
-- 1. If tenant_id is NULL: Register user without tenant (orphan user)
-- 2. If tenant_id is provided: Add user to existing tenant
-- 3. User must be registered in auth.users first
--
-- Use cases:
-- - Register new user without store: tenant_id = NULL
-- - Add user to existing tenant: tenant_id = <existing_id>
-- For creating a tenant + owner, use create_store_tenant instead

CREATE OR REPLACE FUNCTION public.create_tenant_user(
  p_tenant_id bigint DEFAULT NULL,
  p_email text,
  p_name text DEFAULT NULL,
  p_role text DEFAULT 'admin',
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_user_record public.tenant_users;
  v_resolved_user_id uuid;
  v_result jsonb;
BEGIN
  -- Validate input (p_tenant_id is now optional)
  IF NOT public.is_valid_email(p_email) THEN
    RAISE EXCEPTION 'Invalid email format: %', p_email;
  END IF;

  IF p_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'p_role must be either "owner" or "admin"';
  END IF;

  -- Check if tenant exists (only if tenant_id provided)
  IF p_tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tenants WHERE tenant_id = p_tenant_id) THEN
    RAISE EXCEPTION 'Tenant with tenant_id % does not exist', p_tenant_id;
  END IF;

  -- Resolve user_id: provided explicitly or lookup from auth.users
  IF p_user_id IS NOT NULL THEN
    v_resolved_user_id := p_user_id;
  ELSE
    -- Lookup in auth.users by email
    BEGIN
      v_resolved_user_id := public.get_user_id_by_email(p_email);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Cannot create tenant user: user with email % not found in auth.users. User must be registered first.', p_email;
    END;
  END IF;

  -- Check if mapping already exists
  SELECT * INTO v_tenant_user_record 
  FROM public.tenant_users 
  WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id) 
    AND (user_id = v_resolved_user_id OR email = p_email);

  IF FOUND THEN
    IF p_tenant_id IS NULL THEN
      RAISE EXCEPTION 'User % is already registered', p_email;
    ELSE
      RAISE EXCEPTION 'User % is already mapped to tenant %', p_email, p_tenant_id;
    END IF;
  END IF;

  -- Insert new tenant-user mapping
  INSERT INTO public.tenant_users (tenant_id, user_id, email, name, role, status)
  VALUES (p_tenant_id, v_resolved_user_id, p_email, p_name, p_role, 'active')
  RETURNING * INTO v_tenant_user_record;

  -- Build response
  v_result := jsonb_build_object(
    'id', v_tenant_user_record.id,
    'tenant_id', v_tenant_user_record.tenant_id,
    'user_id', v_tenant_user_record.user_id,
    'email', v_tenant_user_record.email,
    'name', v_tenant_user_record.name,
    'role', v_tenant_user_record.role,
    'status', v_tenant_user_record.status,
    'created_at', v_tenant_user_record.created_at
  );

  RETURN v_result;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Failed to create tenant user: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.create_tenant_user(bigint, text, text, text, uuid) IS 
'Creates tenant user by email. Looks up user_id from auth.users or accepts explicit user_id.';

REVOKE ALL ON FUNCTION public.create_tenant_user(bigint, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_tenant_user(bigint, text, text, text, uuid) TO service_role;

-- ============================================================================
-- 4. RPC: update_superadmin (include name and email)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_superadmin(
  p_user_id uuid,
  p_updated_by uuid,
  p_email text DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
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

  -- Validate email if provided
  IF p_email IS NOT NULL AND NOT public.is_valid_email(p_email) THEN
    RAISE EXCEPTION 'Invalid email format: %', p_email;
  END IF;

  -- Check if superadmin exists
  SELECT * INTO v_superadmin_record 
  FROM public.superadmins 
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Superadmin with user_id % does not exist', p_user_id;
  END IF;

  -- Update superadmin
  UPDATE public.superadmins
  SET 
    email = COALESCE(p_email, email),
    name = COALESCE(p_name, name),
    is_active = COALESCE(p_is_active, is_active)
  WHERE user_id = p_user_id
  RETURNING * INTO v_superadmin_record;

  -- Build response
  v_result := jsonb_build_object(
    'id', v_superadmin_record.id,
    'user_id', v_superadmin_record.user_id,
    'email', v_superadmin_record.email,
    'name', v_superadmin_record.name,
    'is_active', v_superadmin_record.is_active,
    'created_at', v_superadmin_record.created_at
  );

  RETURN v_result;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Failed to update superadmin: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.update_superadmin(uuid, uuid, text, text, boolean) IS 
'Updates superadmin fields including email and name';

REVOKE ALL ON FUNCTION public.update_superadmin(uuid, uuid, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_superadmin(uuid, uuid, text, text, boolean) TO service_role;

-- ============================================================================
-- 5. RPC: update_tenant_user (include name and email)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_tenant_user(
  p_tenant_id bigint,
  p_user_id uuid,
  p_email text DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_role text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_user_record public.tenant_users;
  v_result jsonb;
BEGIN
  -- Validate input
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'p_tenant_id is required';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  -- Validate email if provided
  IF p_email IS NOT NULL AND NOT public.is_valid_email(p_email) THEN
    RAISE EXCEPTION 'Invalid email format: %', p_email;
  END IF;

  -- Validate role if provided
  IF p_role IS NOT NULL AND p_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'p_role must be either "owner" or "admin"';
  END IF;

  -- Check if tenant user exists
  SELECT * INTO v_tenant_user_record 
  FROM public.tenant_users 
  WHERE tenant_id = p_tenant_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant user with tenant_id % and user_id % does not exist', p_tenant_id, p_user_id;
  END IF;

  -- Update tenant user
  UPDATE public.tenant_users
  SET 
    email = COALESCE(p_email, email),
    name = COALESCE(p_name, name),
    role = COALESCE(p_role, role)
  WHERE tenant_id = p_tenant_id AND user_id = p_user_id
  RETURNING * INTO v_tenant_user_record;

  -- Build response
  v_result := jsonb_build_object(
    'id', v_tenant_user_record.id,
    'tenant_id', v_tenant_user_record.tenant_id,
    'user_id', v_tenant_user_record.user_id,
    'email', v_tenant_user_record.email,
    'name', v_tenant_user_record.name,
    'role', v_tenant_user_record.role,
    'status', v_tenant_user_record.status,
    'created_at', v_tenant_user_record.created_at
  );

  RETURN v_result;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Failed to update tenant user: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.update_tenant_user(bigint, uuid, text, text, text) IS 
'Updates tenant user fields including email, name, and role';

REVOKE ALL ON FUNCTION public.update_tenant_user(bigint, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_tenant_user(bigint, uuid, text, text, text) TO service_role;

-- ============================================================================
-- 6. MIGRATION NOTES
-- ============================================================================

-- Summary of changes:
--
-- 1. create_superadmin: now accepts (email, name, user_id) with email as primary param
-- 2. create_store_tenant: now accepts (name, owner_email, owner_name, plan, tenant_id, user_id)
-- 3. create_tenant_user: now accepts (tenant_id, email, name, role, user_id)
-- 4. update_superadmin: now supports updating email and name
-- 5. update_tenant_user: now supports updating email and name
--
-- All functions maintain backward compatibility by accepting optional user_id.
-- If user_id is not provided, functions lookup from auth.users by email.
--
-- Auto-increment synchronization:
-- - create_store_tenant generates tenant_id sequentially
-- - For first-time owner, tenant_id aligns with user order (but not strict user_id match due to UUID)
-- - To enforce user_id=tenant_id pattern, additional logic needed at application layer

