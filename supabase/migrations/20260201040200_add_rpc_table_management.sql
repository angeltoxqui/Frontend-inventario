-- Migration: Add RPC functions for Table Management
-- Provides CRUD operations for mesas table within tenant schemas
-- ============================================================
-- GET TENANT TABLES
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_tenant_tables(p_tenant_id bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_schema_name text;
v_result jsonb;
BEGIN
SELECT schema_name INTO v_schema_name
FROM public.tenants
WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL;
IF v_schema_name IS NULL THEN RAISE EXCEPTION 'Tenant % not found',
p_tenant_id;
END IF;
EXECUTE format(
    '
    SELECT COALESCE(jsonb_agg(m), ''[]''::jsonb)
    FROM (
      SELECT id, nombre, ocupada, notas
      FROM %I.mesas
      ORDER BY nombre
    ) m
  ',
    v_schema_name
) INTO v_result;
RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_tenant_tables(bigint)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_tables(bigint) TO service_role;
-- ============================================================
-- CREATE TENANT TABLE
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_tenant_table(
        p_tenant_id bigint,
        p_nombre varchar(30),
        p_notas varchar(100) DEFAULT NULL
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_schema_name text;
v_mesa_id bigint;
BEGIN
SELECT schema_name INTO v_schema_name
FROM public.tenants
WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL;
IF v_schema_name IS NULL THEN RAISE EXCEPTION 'Tenant % not found',
p_tenant_id;
END IF;
EXECUTE format(
    '
    INSERT INTO %I.mesas (nombre, ocupada, notas)
    VALUES ($1, false, $2)
    RETURNING id
  ',
    v_schema_name
) INTO v_mesa_id USING p_nombre,
p_notas;
RETURN jsonb_build_object(
    'mesa_id',
    v_mesa_id,
    'nombre',
    p_nombre,
    'ocupada',
    false
);
END;
$$;
REVOKE ALL ON FUNCTION public.create_tenant_table(bigint, varchar, varchar)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_tenant_table(bigint, varchar, varchar) TO service_role;
-- ============================================================
-- UPDATE TENANT TABLE
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_tenant_table(
        p_tenant_id bigint,
        p_mesa_id bigint,
        p_nombre varchar(30) DEFAULT NULL,
        p_notas varchar(100) DEFAULT NULL
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_schema_name text;
BEGIN
SELECT schema_name INTO v_schema_name
FROM public.tenants
WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL;
IF v_schema_name IS NULL THEN RAISE EXCEPTION 'Tenant % not found',
p_tenant_id;
END IF;
EXECUTE format(
    '
    UPDATE %I.mesas
    SET
      nombre = COALESCE($1, nombre),
      notas = COALESCE($2, notas)
    WHERE id = $3
  ',
    v_schema_name
) USING p_nombre,
p_notas,
p_mesa_id;
RETURN jsonb_build_object('updated', true, 'mesa_id', p_mesa_id);
END;
$$;
REVOKE ALL ON FUNCTION public.update_tenant_table(bigint, bigint, varchar, varchar)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_tenant_table(bigint, bigint, varchar, varchar) TO service_role;
-- ============================================================
-- UPDATE TENANT TABLE STATUS
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_tenant_table_status(
        p_tenant_id bigint,
        p_mesa_id bigint,
        p_ocupada boolean
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_schema_name text;
BEGIN
SELECT schema_name INTO v_schema_name
FROM public.tenants
WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL;
IF v_schema_name IS NULL THEN RAISE EXCEPTION 'Tenant % not found',
p_tenant_id;
END IF;
EXECUTE format(
    '
    UPDATE %I.mesas
    SET ocupada = $1
    WHERE id = $2
  ',
    v_schema_name
) USING p_ocupada,
p_mesa_id;
RETURN jsonb_build_object(
    'updated',
    true,
    'mesa_id',
    p_mesa_id,
    'ocupada',
    p_ocupada
);
END;
$$;
REVOKE ALL ON FUNCTION public.update_tenant_table_status(bigint, bigint, boolean)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_tenant_table_status(bigint, bigint, boolean) TO service_role;