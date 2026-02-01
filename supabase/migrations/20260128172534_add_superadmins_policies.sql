-- RLS Policies: public.superadmins
-- Purpose: Backend-only posture - deny direct access to anon/authenticated users  
-- Related: ../tables/superadmins.sql

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS superadmins_deny_all ON public.superadmins;

-- Create restrictive policy - all access via backend/Edge Functions only
CREATE POLICY superadmins_deny_all ON public.superadmins
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- Defense-in-depth: explicit permission revocation
REVOKE ALL ON TABLE public.superadmins FROM anon, authenticated;

-- Note: service_role retains full access for backend operations
-- Edge Function: manage-superadmins should handle all superadmin operations