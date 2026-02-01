-- Migration: Add RPC functions for Ingredient Management
-- Provides CRUD operations for insumos table within tenant schemas
-- ============================================================
-- GET TENANT INGREDIENTS
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_tenant_ingredients(
        p_tenant_id bigint,
        p_limit integer DEFAULT 100,
        p_offset integer DEFAULT 0
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
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
    SELECT COALESCE(jsonb_agg(i), ''[]''::jsonb)
    FROM (
      SELECT id, nombre, unidad_medida, costo, stock_actual, nota
      FROM %I.insumos
      ORDER BY nombre
      LIMIT $1 OFFSET $2
    ) i
  ',
    v_schema_name
) INTO v_result USING p_limit,
p_offset;
RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_tenant_ingredients(bigint, integer, integer)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_ingredients(bigint, integer, integer) TO service_role;
-- ============================================================
-- CREATE TENANT INGREDIENT
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_tenant_ingredient(
        p_tenant_id bigint,
        p_nombre varchar(50),
        p_unidad_medida varchar(20),
        p_costo numeric(10, 3) DEFAULT 0,
        p_stock_actual numeric(10, 3) DEFAULT 0,
        p_nota varchar(100) DEFAULT NULL
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_schema_name text;
v_insumo_id bigint;
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
    INSERT INTO %I.insumos (nombre, unidad_medida, costo, stock_actual, nota)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  ',
    v_schema_name
) INTO v_insumo_id USING p_nombre,
p_unidad_medida,
p_costo,
p_stock_actual,
p_nota;
RETURN jsonb_build_object(
    'insumo_id',
    v_insumo_id,
    'nombre',
    p_nombre,
    'unidad_medida',
    p_unidad_medida,
    'stock_actual',
    p_stock_actual
);
END;
$$;
REVOKE ALL ON FUNCTION public.create_tenant_ingredient(
    bigint,
    varchar,
    varchar,
    numeric,
    numeric,
    varchar
)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_tenant_ingredient(
        bigint,
        varchar,
        varchar,
        numeric,
        numeric,
        varchar
    ) TO service_role;
-- ============================================================
-- UPDATE TENANT INGREDIENT
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_tenant_ingredient(
        p_tenant_id bigint,
        p_insumo_id bigint,
        p_nombre varchar(50) DEFAULT NULL,
        p_unidad_medida varchar(20) DEFAULT NULL,
        p_costo numeric(10, 3) DEFAULT NULL,
        p_nota varchar(100) DEFAULT NULL
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
    UPDATE %I.insumos
    SET
      nombre = COALESCE($1, nombre),
      unidad_medida = COALESCE($2, unidad_medida),
      costo = COALESCE($3, costo),
      nota = COALESCE($4, nota)
    WHERE id = $5
  ',
    v_schema_name
) USING p_nombre,
p_unidad_medida,
p_costo,
p_nota,
p_insumo_id;
RETURN jsonb_build_object('updated', true, 'insumo_id', p_insumo_id);
END;
$$;
REVOKE ALL ON FUNCTION public.update_tenant_ingredient(
    bigint,
    bigint,
    varchar,
    varchar,
    numeric,
    varchar
)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_tenant_ingredient(
        bigint,
        bigint,
        varchar,
        varchar,
        numeric,
        varchar
    ) TO service_role;
-- ============================================================
-- DELETE TENANT INGREDIENT
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_tenant_ingredient(p_tenant_id bigint, p_insumo_id bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
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
    DELETE FROM %I.insumos WHERE id = $1
  ',
    v_schema_name
) USING p_insumo_id;
RETURN jsonb_build_object('deleted', true, 'insumo_id', p_insumo_id);
END;
$$;
REVOKE ALL ON FUNCTION public.delete_tenant_ingredient(bigint, bigint)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_tenant_ingredient(bigint, bigint) TO service_role;
-- ============================================================
-- ADJUST TENANT INGREDIENT STOCK
-- ============================================================
CREATE OR REPLACE FUNCTION public.adjust_tenant_ingredient_stock(
        p_tenant_id bigint,
        p_insumo_id bigint,
        p_cantidad numeric(10, 3),
        p_motivo varchar(100) DEFAULT NULL
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_schema_name text;
v_new_stock numeric(10, 3);
BEGIN
SELECT schema_name INTO v_schema_name
FROM public.tenants
WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL;
IF v_schema_name IS NULL THEN RAISE EXCEPTION 'Tenant % not found',
p_tenant_id;
END IF;
-- Update stock and return new value
EXECUTE format(
    '
    UPDATE %I.insumos
    SET stock_actual = stock_actual + $1
    WHERE id = $2
    RETURNING stock_actual
  ',
    v_schema_name
) INTO v_new_stock USING p_cantidad,
p_insumo_id;
RETURN jsonb_build_object(
    'adjusted',
    true,
    'insumo_id',
    p_insumo_id,
    'cantidad_ajustada',
    p_cantidad,
    'nuevo_stock',
    v_new_stock,
    'motivo',
    p_motivo
);
END;
$$;
REVOKE ALL ON FUNCTION public.adjust_tenant_ingredient_stock(bigint, bigint, numeric, varchar)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_tenant_ingredient_stock(bigint, bigint, numeric, varchar) TO service_role;