-- ============================================================================
-- RPCs para ciclo de vida del tenant (update, pause, resume, delete)
-- Usado por Edge Function: tenant_management
-- ============================================================================

-- ----------------------------------------------------------------------------
-- UPDATE_TENANT: Actualizar metadata (nombre, plan, meta JSON)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_tenant(
    p_tenant_id INTEGER,
    p_name TEXT DEFAULT NULL,
    p_plan TEXT DEFAULT NULL,
    p_meta JSONB DEFAULT NULL
)
RETURNS TABLE(
    tenant_id INTEGER,
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
    -- Validar que existe el tenant
    IF NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.tenant_id = p_tenant_id) THEN
        RAISE EXCEPTION 'Tenant % does not exist', p_tenant_id
            USING ERRCODE = 'P0002';  -- no_data_found
    END IF;

    -- Validar que no está eliminado
    IF EXISTS (SELECT 1 FROM public.tenants t WHERE t.tenant_id = p_tenant_id AND t.status = 'deleted') THEN
        RAISE EXCEPTION 'Cannot update deleted tenant %', p_tenant_id
            USING ERRCODE = 'P0003';  -- integrity_constraint_violation
    END IF;

    -- Actualizar solo campos proporcionados (COALESCE mantiene valor actual si NULL)
    UPDATE public.tenants t
    SET
        name = COALESCE(p_name, t.name),
        plan = COALESCE(p_plan, t.plan),
        meta = COALESCE(p_meta, t.meta),
        updated_at = NOW()
    WHERE t.tenant_id = p_tenant_id;

    -- Retornar tenant actualizado
    RETURN QUERY
    SELECT t.tenant_id, t.name, t.plan, t.status, t.schema_name, t.meta, t.updated_at
    FROM public.tenants t
    WHERE t.tenant_id = p_tenant_id;
END;
$$;

COMMENT ON FUNCTION public.update_tenant IS 
'Actualiza metadata del tenant (nombre, plan, meta). No permite actualizar tenant eliminado.';

-- ----------------------------------------------------------------------------
-- PAUSE_TENANT: Suspender tenant (status -> suspended)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pause_tenant(
    p_tenant_id INTEGER,
    p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
    tenant_id INTEGER,
    schema_name TEXT,
    status TEXT,
    paused_at TIMESTAMPTZ,
    reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_status TEXT;
BEGIN
    -- Obtener estado actual
    SELECT t.status INTO v_current_status
    FROM public.tenants t
    WHERE t.tenant_id = p_tenant_id;

    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Tenant % does not exist', p_tenant_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_current_status = 'suspended' THEN
        RAISE EXCEPTION 'Tenant % is already suspended', p_tenant_id
            USING ERRCODE = 'P0004';
    END IF;

    IF v_current_status = 'deleted' THEN
        RAISE EXCEPTION 'Cannot pause deleted tenant %', p_tenant_id
            USING ERRCODE = 'P0003';
    END IF;

    -- Suspender
    UPDATE public.tenants t
    SET
        status = 'suspended',
        meta = COALESCE(t.meta, '{}'::jsonb) || 
               jsonb_build_object('suspended_at', NOW()::text, 'suspend_reason', COALESCE(p_reason, 'manual')),
        updated_at = NOW()
    WHERE t.tenant_id = p_tenant_id;

    -- Retornar resultado
    RETURN QUERY
    SELECT t.tenant_id, t.schema_name, t.status, NOW() AS paused_at, COALESCE(p_reason, 'manual') AS reason
    FROM public.tenants t
    WHERE t.tenant_id = p_tenant_id;
END;
$$;

COMMENT ON FUNCTION public.pause_tenant IS 
'Suspende un tenant (status=suspended). Guarda razón y timestamp en meta.';

-- ----------------------------------------------------------------------------
-- RESUME_TENANT: Reactivar tenant (status -> active)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resume_tenant(
    p_tenant_id INTEGER
)
RETURNS TABLE(
    tenant_id INTEGER,
    schema_name TEXT,
    status TEXT,
    resumed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_status TEXT;
BEGIN
    -- Obtener estado actual
    SELECT t.status INTO v_current_status
    FROM public.tenants t
    WHERE t.tenant_id = p_tenant_id;

    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Tenant % does not exist', p_tenant_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_current_status = 'active' THEN
        RAISE EXCEPTION 'Tenant % is already active', p_tenant_id
            USING ERRCODE = 'P0004';
    END IF;

    IF v_current_status = 'deleted' THEN
        RAISE EXCEPTION 'Cannot resume deleted tenant %', p_tenant_id
            USING ERRCODE = 'P0003';
    END IF;

    -- Reactivar
    UPDATE public.tenants t
    SET
        status = 'active',
        meta = COALESCE(t.meta, '{}'::jsonb) || 
               jsonb_build_object('resumed_at', NOW()::text),
        updated_at = NOW()
    WHERE t.tenant_id = p_tenant_id;

    -- Retornar resultado
    RETURN QUERY
    SELECT t.tenant_id, t.schema_name, t.status, NOW() AS resumed_at
    FROM public.tenants t
    WHERE t.tenant_id = p_tenant_id;
END;
$$;

COMMENT ON FUNCTION public.resume_tenant IS 
'Reactiva un tenant suspendido (status=active). Guarda timestamp en meta.';

-- ----------------------------------------------------------------------------
-- DELETE_TENANT: Eliminar tenant (soft-delete por defecto, hard-delete opcional)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_tenant(
    p_tenant_id INTEGER,
    p_hard_delete BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    tenant_id INTEGER,
    schema_name TEXT,
    action TEXT,
    deleted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_schema_name TEXT;
    v_current_status TEXT;
BEGIN
    -- Obtener datos actuales
    SELECT t.schema_name, t.status INTO v_schema_name, v_current_status
    FROM public.tenants t
    WHERE t.tenant_id = p_tenant_id;

    IF v_schema_name IS NULL THEN
        RAISE EXCEPTION 'Tenant % does not exist', p_tenant_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_current_status = 'deleted' AND NOT p_hard_delete THEN
        RAISE EXCEPTION 'Tenant % is already deleted', p_tenant_id
            USING ERRCODE = 'P0004';
    END IF;

    IF p_hard_delete THEN
        -- HARD DELETE: Eliminar schema y registro
        -- ⚠️ IRREVERSIBLE - usar con cuidado
        
        -- Eliminar schema del tenant (CASCADE elimina todas las tablas)
        EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', v_schema_name);
        
        -- Eliminar registros relacionados
        DELETE FROM public.tenant_users tu WHERE tu.tenant_id = p_tenant_id;
        DELETE FROM public.schema_migration_history smh WHERE smh.schema_name = v_schema_name;
        DELETE FROM public.tenants t WHERE t.tenant_id = p_tenant_id;
        
        RETURN QUERY
        SELECT p_tenant_id, v_schema_name, 'hard_delete'::TEXT, NOW();
    ELSE
        -- SOFT DELETE: Solo marcar como eliminado
        UPDATE public.tenants t
        SET
            status = 'deleted',
            meta = COALESCE(t.meta, '{}'::jsonb) || 
                   jsonb_build_object('deleted_at', NOW()::text, 'deleted_by', 'api'),
            updated_at = NOW()
        WHERE t.tenant_id = p_tenant_id;
        
        RETURN QUERY
        SELECT t.tenant_id, t.schema_name, 'soft_delete'::TEXT, NOW()
        FROM public.tenants t
        WHERE t.tenant_id = p_tenant_id;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.delete_tenant IS 
'Elimina un tenant. Soft-delete por defecto (status=deleted). Hard-delete elimina schema y registros.';

-- ============================================================================
-- GRANTS: Permisos para service_role (usado por Edge Functions)
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.update_tenant TO service_role;
GRANT EXECUTE ON FUNCTION public.pause_tenant TO service_role;
GRANT EXECUTE ON FUNCTION public.resume_tenant TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_tenant TO service_role;

-- Revocar de authenticated/anon (solo service_role puede ejecutar)
REVOKE EXECUTE ON FUNCTION public.update_tenant FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.pause_tenant FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.resume_tenant FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.delete_tenant FROM authenticated, anon;
