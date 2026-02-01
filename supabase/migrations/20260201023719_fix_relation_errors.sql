-- Migration: 20260201023719_fix_relation_errors.sql
-- Purpose: Add missing foreign key constraints for email-based user management
-- Date: 2026-02-01
-- Author: System Migration Fix
--
-- This migration adds only the foreign key constraints that are expected by RPC functions.
-- Other indexes and columns are handled by previous migrations (fix_columns.sql, etc.)

BEGIN;

-- ============================================================================
-- 1. Add foreign key: superadmins.user_id -> auth.users(id)
-- ============================================================================

-- FK: superadmins.user_id -> auth.users(id) with RESTRICT policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_superadmins_user_id_auth_users'
      AND conrelid = 'public.superadmins'::regclass
  ) THEN
    ALTER TABLE public.superadmins
      ADD CONSTRAINT fk_superadmins_user_id_auth_users
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
  END IF;
END$$;

-- ============================================================================
-- 2. Add foreign key: tenant_users.user_id -> auth.users(id)  
-- ============================================================================

-- FK: tenant_users.user_id -> auth.users(id) with RESTRICT policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_tenant_users_user_id_auth_users'
      AND conrelid = 'public.tenant_users'::regclass
  ) THEN
    ALTER TABLE public.tenant_users
      ADD CONSTRAINT fk_tenant_users_user_id_auth_users
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
  END IF;
END$$;

-- ============================================================================
-- 3. Add only missing indexes (avoid duplicates from fix_columns.sql)
-- ============================================================================

-- Index for superadmins email queries (not created elsewhere)
CREATE INDEX IF NOT EXISTS idx_superadmins_email 
ON public.superadmins(email) 
WHERE email IS NOT NULL;

-- Index for superadmins active status
CREATE INDEX IF NOT EXISTS idx_superadmins_active 
ON public.superadmins(is_active) 
WHERE is_active = true;

-- NOTE: tenant_users email indexes already created by fix_columns.sql - skip duplicates

-- ============================================================================
-- 4. Migration completion
-- ============================================================================

-- This migration ensures referential integrity between platform tables and auth.users.
-- Combined with fix_columns.sql and fix_helpers.sql, enables email-based user management.

COMMIT;