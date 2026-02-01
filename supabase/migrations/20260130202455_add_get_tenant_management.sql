-- RPC: get_tenants
-- Lists all tenant records from public.tenants with optional filtering
-- SECURITY DEFINER: execution restricted to trusted roles/functions

CREATE OR REPLACE FUNCTION public.get_tenants(
p_limit integer DEFAULT 100,
p_offset integer DEFAULT 0,
p_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
v_result jsonb;
v_tenants jsonb := '[]'::jsonb;
v_total_count integer;
v_where_clause text := '';
v_query text;
r record;
BEGIN
-- Validate input
IF p_limit IS NULL OR p_limit < 1 OR p_limit > 1000 THEN
p_limit := 100;
END IF;
IF p_offset IS NULL OR p_offset < 0 THEN
p_offset := 0;
END IF;

-- Build WHERE clause for status filter
IF p_status IS NOT NULL AND p_status != '' THEN
IF p_status NOT IN ('active', 'suspended', 'pending') THEN
    RAISE EXCEPTION 'Invalid status filter. Must be: active, suspended, or pending';
END IF;
v_where_clause := ' WHERE status = $1';
END IF;

-- Get total count
v_query := 'SELECT COUNT(*) FROM public.tenants' || v_where_clause;
IF p_status IS NOT NULL AND p_status != '' THEN
EXECUTE v_query INTO v_total_count USING p_status;
ELSE
EXECUTE v_query INTO v_total_count;
END IF;

-- Get tenants with pagination
IF p_status IS NOT NULL AND p_status != '' THEN
v_query := 'SELECT * FROM public.tenants WHERE status = $3 ORDER BY created_at DESC LIMIT $1 OFFSET $2';
FOR r IN EXECUTE v_query USING p_limit, p_offset, p_status
LOOP
    v_tenants := v_tenants || jsonb_build_object(
    'tenant_id', r.tenant_id,
    'schema_name', r.schema_name,
    'name', r.name,
    'plan', r.plan,
    'status', r.status,
    'created_at', r.created_at,
    'updated_at', r.updated_at,
    'meta', r.meta
    );
END LOOP;
ELSE
v_query := 'SELECT * FROM public.tenants ORDER BY created_at DESC LIMIT $1 OFFSET $2';
FOR r IN EXECUTE v_query USING p_limit, p_offset
LOOP
    v_tenants := v_tenants || jsonb_build_object(
    'tenant_id', r.tenant_id,
    'schema_name', r.schema_name,
    'name', r.name,
    'plan', r.plan,
    'status', r.status,
    'created_at', r.created_at,
    'updated_at', r.updated_at,
    'meta', r.meta
    );
END LOOP;
END IF;

-- Build response
v_result := jsonb_build_object(
'tenants', v_tenants,
'pagination', jsonb_build_object(
    'limit', p_limit,
    'offset', p_offset,
    'total_count', v_total_count,
    'current_count', jsonb_array_length(v_tenants),
    'has_more', (p_offset + p_limit) < v_total_count
),
'status_filter', p_status,
'summary', jsonb_build_object(
    'active_count', (SELECT COUNT(*) FROM public.tenants WHERE status = 'active'),
    'suspended_count', (SELECT COUNT(*) FROM public.tenants WHERE status = 'suspended'),
    'pending_count', (SELECT COUNT(*) FROM public.tenants WHERE status = 'pending')
)
);

RETURN v_result;
EXCEPTION
WHEN others THEN
RAISE EXCEPTION 'Failed to get tenants: %', SQLERRM;
END;
$$;

-- Hardening: revoke public, grant only service_role
REVOKE ALL ON FUNCTION public.get_tenants(integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenants(integer, integer, text) TO service_role;