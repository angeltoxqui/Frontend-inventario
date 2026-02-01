-- Fix tenant lifecycle RPCs - correct data types and constraints
-- Issue: "structure of query does not match function result type"  
-- Cause: bigint vs INTEGER mismatch + status constraint
-- Also: Add 'plus' plan to allowed plans

-- ============================================================================
-- 1. Update table constraints
-- ============================================================================

-- Add 'deleted' to status constraint
ALTER TABLE public.tenants 
DROP CONSTRAINT IF EXISTS tenants_status_check;

ALTER TABLE public.tenants 
ADD CONSTRAINT tenants_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'deleted'::text]));

-- Add 'plus' to plan constraint  
ALTER TABLE public.tenants 
DROP CONSTRAINT IF EXISTS tenants_plan_check;

ALTER TABLE public.tenants 
ADD CONSTRAINT tenants_plan_check 
CHECK (plan = ANY (ARRAY['basic'::text, 'pro'::text, 'plus'::text, 'enterprise'::text]));

-- ============================================================================
-- 2. Fix UPDATE_TENANT - change INTEGER to BIGINT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_tenant(
    p_tenant_id BIGINT,
    p_name TEXT DEFAULT NULL,
    p_plan TEXT DEFAULT NULL,
    p_meta JSONB DEFAULT NULL
)
RETURNS TABLE(
    tenant_id BIGINT,
    name TEXT,
    plan TEXT,
    status TEXT,
    schema_name TEXT,
    meta JSONB,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.tenant_id = p_tenant_id) THEN
        RAISE EXCEPTION 'Tenant % does not exist', p_tenant_id USING ERRCODE = 'P0002';
    END IF;

    IF EXISTS (SELECT 1 FROM public.tenants t WHERE t.tenant_id = p_tenant_id AND t.status = 'deleted') THEN
        RAISE EXCEPTION 'Cannot update deleted tenant %', p_tenant_id USING ERRCODE = 'P0003';
    END IF;

    UPDATE public.tenants t
    SET
        name = COALESCE(p_name, t.name),
        plan = COALESCE(p_plan, t.plan),
        meta = COALESCE(p_meta, t.meta),
        updated_at = NOW()
    WHERE t.tenant_id = p_tenant_id;

    RETURN QUERY
    SELECT t.tenant_id, t.name, t.plan, t.status, t.schema_name, t.meta, t.updated_at
    FROM public.tenants t
    WHERE t.tenant_id = p_tenant_id;
END;
$$;