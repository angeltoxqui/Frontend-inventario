-- Migration: fix_columns.sql
-- Purpose: Add name and email columns to support email-based user management
-- Date: 2026-01-30
-- Author: System Refactor
-- 
-- Changes:
-- 1. Add 'name' column to public.superadmins
-- 2. Add 'name' and 'email' columns to public.tenant_users
-- 3. Update constraints for email-based user flows
-- 
-- Note: This migration is idempotent and can be safely re-run

-- ============================================================================
-- 1. ALTER TABLE: public.superadmins
-- ============================================================================

-- Add 'name' column for superadmin display names
ALTER TABLE public.superadmins 
ADD COLUMN IF NOT EXISTS name text;

-- Update comments for clarity
COMMENT ON COLUMN public.superadmins.name IS 'Display name of the superadmin';
COMMENT ON COLUMN public.superadmins.email IS 'Email address of the superadmin (may not match auth.users.email if custom)';

-- ============================================================================
-- 2. ALTER TABLE: public.tenant_users
-- ============================================================================

-- Add 'name' column for user display names
ALTER TABLE public.tenant_users 
ADD COLUMN IF NOT EXISTS name text;

-- Add 'email' column to support email-based user identification
ALTER TABLE public.tenant_users 
ADD COLUMN IF NOT EXISTS email text;

-- Add 'status' column to track user state within tenant context
ALTER TABLE public.tenant_users 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' 
CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text]));

-- Update comments for clarity
COMMENT ON COLUMN public.tenant_users.name IS 'Display name of the tenant user';
COMMENT ON COLUMN public.tenant_users.email IS 'Email address of the tenant user (cached from auth.users for query performance)';
COMMENT ON COLUMN public.tenant_users.status IS 'Status of the user within this tenant (active|suspended)';

-- ============================================================================
-- 3. CREATE INDEX: Improve query performance on email lookups
-- ============================================================================

-- Index for tenant_users email queries (common in login/assignment flows)
CREATE INDEX IF NOT EXISTS idx_tenant_users_email 
ON public.tenant_users(email) 
WHERE email IS NOT NULL;

-- Index for tenant_users composite lookups (tenant + email)
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_email 
ON public.tenant_users(tenant_id, email) 
WHERE email IS NOT NULL;

-- ============================================================================
-- 4. MIGRATION NOTES
-- ============================================================================

-- Backward compatibility:
-- - Existing records will have NULL in new columns (name, email, status defaults to 'active')
-- - user_id remains as FK to auth.users.id (maintains existing auth integration)
-- - email is NOT UNIQUE globally (same user can be in multiple tenants)
-- - For multi-tenant scenarios: same email may appear in multiple tenant_users rows
--
-- Future operations:
-- - create_superadmin should accept 'email' and 'name' (user_id optional/generated)
-- - create_tenant_user should accept 'email' and 'name' (user_id optional/lookup)
-- - create_store_tenant should accept 'owner_email' (generate tenant_id and user_id sync'd)
--
-- Auto-increment synchronization pattern:
-- - When creating a new user who is also creating their first tenant:
--   1. Generate next_user_id from sequence
--   2. Use same ID as tenant_id (user_1 → tenant_1)
--   3. This is handled in RPC logic, not at DB constraint level

