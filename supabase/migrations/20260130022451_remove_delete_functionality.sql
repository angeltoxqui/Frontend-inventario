-- Remove 'deleted' status from tenants table
-- Only allow 'active' and 'suspended' status values
-- Part of delete functionality removal

-- Update constraint to only allow active/suspended
ALTER TABLE public.tenants 
DROP CONSTRAINT IF EXISTS tenants_status_check;

ALTER TABLE public.tenants 
ADD CONSTRAINT tenants_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text]));

-- Update any existing 'deleted' tenants to 'suspended' status
UPDATE public.tenants 
SET status = 'suspended', 
    meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object('converted_from_deleted', now()::text)
WHERE status = 'deleted';

-- Drop the old delete_tenant functions if they exist
DROP FUNCTION IF EXISTS public.delete_tenant(bigint, boolean);
DROP FUNCTION IF EXISTS public.delete_tenant(integer, boolean);
DROP FUNCTION IF EXISTS public.delete_store_tenant(bigint, boolean);

COMMENT ON CONSTRAINT tenants_status_check ON public.tenants IS 
'Only active and suspended status allowed. Delete functionality removed.';