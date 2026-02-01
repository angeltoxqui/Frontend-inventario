-- RPC: resume_tenant_user
-- Reactivar mapping tenant-user (marcar como activo)
-- Security: DEFINER (requiere service_role)

CREATE OR REPLACE FUNCTION public.resume_tenant_user(
    p_tenant_id BIGINT,
    p_user_id TEXT
) RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_result jsonb;
    v_rows_affected INTEGER;
BEGIN
    -- Validar que el tenant existe
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE tenant_id = p_tenant_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Tenant not found',
            'error_code', 'TENANT_NOT_FOUND',
            'tenant_id', p_tenant_id
        );
    END IF;

    -- Validar que el user_id es UUID válido
    IF p_user_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid user_id format (must be UUID)',
            'error_code', 'INVALID_USER_ID',
            'user_id', p_user_id
        );
    END IF;

    -- Reactivar tenant-user (marcar como activo)
    UPDATE public.tenant_users 
    SET 
        is_active = true,
        updated_at = NOW(),
        meta = COALESCE(meta, '{}'::jsonb) - 'pause_reason' || 
               jsonb_build_object('resumed_at', NOW())
    WHERE tenant_id = p_tenant_id 
      AND user_id = p_user_id::uuid;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    IF v_rows_affected = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Tenant-user mapping not found',
            'error_code', 'MAPPING_NOT_FOUND',
            'tenant_id', p_tenant_id,
            'user_id', p_user_id
        );
    END IF;

    -- Construir respuesta exitosa
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Tenant-user mapping resumed successfully',
        'tenant_id', p_tenant_id,
        'user_id', p_user_id,
        'is_active', true,
        'resumed_at', NOW()
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Database error: ' || SQLERRM,
            'error_code', 'DATABASE_ERROR',
            'tenant_id', p_tenant_id,
            'user_id', p_user_id
        );
END;
$$;

-- Hardening: revoke public, grant only service_role
REVOKE ALL ON FUNCTION public.resume_tenant_user(BIGINT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resume_tenant_user(BIGINT, TEXT) TO service_role;