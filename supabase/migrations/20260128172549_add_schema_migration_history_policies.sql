-- RLS Policies: public.schema_migration_history
-- Purpose: Backend-only posture - deny direct access to anon/authenticated users
-- Related: ../tables/schema_migration_history.sql

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS schema_migration_deny_all ON public.schema_migration_history;

-- Create restrictive policy - all access via backend/Edge Functions only
CREATE POLICY schema_migration_deny_all ON public.schema_migration_history
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- Defense-in-depth: explicit permission revocation
REVOKE ALL ON TABLE public.schema_migration_history FROM anon, authenticated;

-- Note: service_role retains full access for backend operations
-- This table should only be accessed by migration scripts and backend systems