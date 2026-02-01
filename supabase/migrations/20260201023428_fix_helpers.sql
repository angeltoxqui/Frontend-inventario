-- Migration: fix_helpers.sql
-- Purpose: Update helper functions to support email-based user management
-- Date: 2026-01-30
-- Author: System Refactor
-- 
-- Changes:
-- 1. Add email validation helper
-- 2. Add user lookup by email helper
-- 3. Add tenant-user lookup by email helper
-- 4. Update existing helpers to handle new columns
--
-- Note: These helpers complement the existing triggers in sql/helpers/functions.sql

-- ============================================================================
-- 1. EMAIL VALIDATION HELPER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_valid_email(p_email text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Basic email format validation (RFC 5322 simplified)
  -- Pattern: <local>@<domain> with basic constraints
  RETURN p_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

COMMENT ON FUNCTION public.is_valid_email(text) IS 
'Validates email format using simplified RFC 5322 pattern';

-- ============================================================================
-- 2. USER LOOKUP BY EMAIL (from auth.users)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Validate email format
  IF NOT public.is_valid_email(p_email) THEN
    RAISE EXCEPTION 'Invalid email format: %', p_email;
  END IF;

  -- Lookup in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found in auth.users', p_email;
  END IF;

  RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION public.get_user_id_by_email(text) IS 
'Resolves auth.users.id from email address (throws exception if not found)';

-- ============================================================================
-- 3. TENANT USER LOOKUP BY EMAIL
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_tenant_user_by_email(
  p_tenant_id bigint,
  p_email text
)
RETURNS public.tenant_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_user public.tenant_users;
BEGIN
  -- Validate email format
  IF NOT public.is_valid_email(p_email) THEN
    RAISE EXCEPTION 'Invalid email format: %', p_email;
  END IF;

  -- Lookup in tenant_users
  SELECT * INTO v_tenant_user
  FROM public.tenant_users
  WHERE tenant_id = p_tenant_id 
    AND email = p_email
  LIMIT 1;

  IF v_tenant_user IS NULL THEN
    RAISE EXCEPTION 'Tenant user with email % not found in tenant %', p_email, p_tenant_id;
  END IF;

  RETURN v_tenant_user;
END;
$$;

COMMENT ON FUNCTION public.get_tenant_user_by_email(bigint, text) IS 
'Finds tenant_users record by tenant_id and email (throws exception if not found)';

-- ============================================================================
-- 4. SYNC EMAIL FROM AUTH.USERS HELPER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_email_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- If email is NULL and user_id is present, fetch from auth.users
  IF NEW.email IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT email INTO NEW.email
    FROM auth.users
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_email_from_auth() IS 
'Trigger function to auto-populate email from auth.users when user_id is provided';

-- ============================================================================
-- 5. CREATE TRIGGERS: Auto-sync email on INSERT/UPDATE
-- ============================================================================

-- Trigger for tenant_users: sync email when user_id changes
CREATE TRIGGER tenant_users_sync_email
  BEFORE INSERT OR UPDATE OF user_id ON public.tenant_users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_email_from_auth();

-- Trigger for superadmins: sync email when user_id changes
CREATE TRIGGER superadmins_sync_email
  BEFORE INSERT OR UPDATE OF user_id ON public.superadmins
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_email_from_auth();

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute on helper functions to service_role
GRANT EXECUTE ON FUNCTION public.is_valid_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_tenant_user_by_email(bigint, text) TO service_role;

-- ============================================================================
-- 7. MIGRATION NOTES
-- ============================================================================

-- Usage examples:
--
-- 1. Validate email before insert:
--    IF NOT public.is_valid_email('user@example.com') THEN
--      RAISE EXCEPTION 'Invalid email';
--    END IF;
--
-- 2. Lookup user_id from email:
--    v_user_id := public.get_user_id_by_email('user@example.com');
--
-- 3. Find tenant user by email:
--    v_tenant_user := public.get_tenant_user_by_email(1, 'admin@tenant.com');
--
-- 4. Auto-sync trigger behavior:
--    INSERT INTO tenant_users (tenant_id, user_id, role)
--    VALUES (1, '<uuid>', 'admin');
--    -- email will be auto-populated from auth.users

