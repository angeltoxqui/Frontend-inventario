-- Migration: allow_tenant_users_without_tenant.sql
-- Purpose: Allow users to be registered in tenant_users without an assigned tenant
-- Date: 2026-02-01
-- Author: System Refactor
--
-- Changes:
-- 1. Remove NOT NULL constraint from tenant_id
-- 2. Replace UNIQUE constraint with partial unique index
-- 3. Update FK to allow NULL tenant_id
--
-- Rationale:
-- Users can register without a tenant assigned. When a superadmin creates
-- their store via create_store_tenant, the tenant_id gets assigned.
-- This allows "orphan" users who are registered but don't have a store yet.

-- ============================================================================
-- 1. DROP existing constraints
-- ============================================================================

-- Drop the existing unique constraint (tenant_id, user_id)
ALTER TABLE public.tenant_users 
DROP CONSTRAINT IF EXISTS tenant_users_unique;

-- Drop the existing foreign key constraint
ALTER TABLE public.tenant_users 
DROP CONSTRAINT IF EXISTS tenant_users_tenant_id_fkey;

-- ============================================================================
-- 2. ALTER COLUMN: Allow NULL for tenant_id
-- ============================================================================

ALTER TABLE public.tenant_users 
ALTER COLUMN tenant_id DROP NOT NULL;

-- ============================================================================
-- 3. CREATE partial unique indexes
-- ============================================================================

-- Unique constraint for users WITH tenant (prevents duplicate user in same tenant)
CREATE UNIQUE INDEX IF NOT EXISTS tenant_users_tenant_user_unique 
ON public.tenant_users (tenant_id, user_id) 
WHERE tenant_id IS NOT NULL;

-- Unique constraint for users WITHOUT tenant (prevents duplicate orphan users)
CREATE UNIQUE INDEX IF NOT EXISTS tenant_users_orphan_user_unique 
ON public.tenant_users (user_id) 
WHERE tenant_id IS NULL;

-- Unique constraint for email per tenant (or orphan)
CREATE UNIQUE INDEX IF NOT EXISTS tenant_users_tenant_email_unique 
ON public.tenant_users (tenant_id, email) 
WHERE tenant_id IS NOT NULL AND email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tenant_users_orphan_email_unique 
ON public.tenant_users (email) 
WHERE tenant_id IS NULL AND email IS NOT NULL;

-- ============================================================================
-- 4. RE-CREATE foreign key with NULL allowed
-- ============================================================================

ALTER TABLE public.tenant_users 
ADD CONSTRAINT tenant_users_tenant_id_fkey
FOREIGN KEY (tenant_id) 
REFERENCES public.tenants(tenant_id) 
ON DELETE CASCADE;

-- ============================================================================
-- 5. UPDATE comments
-- ============================================================================

COMMENT ON COLUMN public.tenant_users.tenant_id IS 
'Tenant ID (NULL for users registered but not yet assigned to a tenant)';

COMMENT ON TABLE public.tenant_users IS 
'Maps Supabase Auth users to tenants. Users can exist without tenant (orphans) until assigned via create_store_tenant.';
