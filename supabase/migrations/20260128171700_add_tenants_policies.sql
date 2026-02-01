-- RLS Policies: public.tenants
-- Purpose: Backend-only posture - deny direct access to anon/authenticated users
-- Related: ../tables/tenants.sql

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS tenants_deny_all ON public.tenants;

-- Create restrictive policy - all access via backend/Edge Functions only
CREATE POLICY tenants_deny_all ON public.tenants
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- Defense-in-depth: explicit permission revocation
REVOKE ALL ON TABLE public.tenants FROM anon, authenticated;

-- Note: service_role retains full access for backend operations
-- Consider adding specific policies for Edge Functions if needed:
-- CREATE POLICY tenants_edge_function_access ON public.tenants
--   FOR ALL TO service_role
--   USING (true) WITH CHECK (true);