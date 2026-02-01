-- RLS Policies: public.tenant_users
-- Purpose: Backend-only posture - deny direct access to anon/authenticated users
-- Related: ../tables/tenant_users.sql

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS tenant_users_deny_all ON public.tenant_users;

-- Create restrictive policy - all access via backend/Edge Functions only
CREATE POLICY tenant_users_deny_all ON public.tenant_users
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- Defense-in-depth: explicit permission revocation  
REVOKE ALL ON TABLE public.tenant_users FROM anon, authenticated;

-- Note: service_role retains full access for backend operations
-- Edge Function: tenant-operations should handle user-tenant relationships