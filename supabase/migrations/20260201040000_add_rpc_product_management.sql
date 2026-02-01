-- Migration: Add RPC functions for Product Management
-- Provides CRUD operations for productos table within tenant schemas
-- ============================================================
-- GET TENANT PRODUCTS
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_tenant_products(
        p_tenant_id bigint,
        p_limit integer DEFAULT 100,
        p_offset integer DEFAULT 0
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_schema_name text;
v_result jsonb;
BEGIN -- Get schema name from tenant
SELECT schema_name INTO v_schema_name
FROM public.tenants
WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL;
IF v_schema_name IS NULL THEN RAISE EXCEPTION 'Tenant % not found',
p_tenant_id;
END IF;
-- Query products from tenant schema
EXECUTE format(
    '
    SELECT COALESCE(jsonb_agg(p), ''[]''::jsonb)
    FROM (
      SELECT id, nombre, precio, nota
      FROM %I.productos
      ORDER BY id DESC
      LIMIT $1 OFFSET $2
    ) p
  ',
    v_schema_name
) INTO v_result USING p_limit,
p_offset;
RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_tenant_products(bigint, integer, integer)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_products(bigint, integer, integer) TO service_role;
-- ============================================================
-- CREATE TENANT PRODUCT
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_tenant_product(
        p_tenant_id bigint,
        p_nombre varchar(30),
        p_precio numeric(10, 3),
        p_nota varchar(100) DEFAULT NULL,
        p_receta jsonb DEFAULT NULL
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_schema_name text;
v_producto_id bigint;
v_receta_id bigint;
v_item jsonb;
BEGIN -- Get schema name from tenant
SELECT schema_name INTO v_schema_name
FROM public.tenants
WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL;
IF v_schema_name IS NULL THEN RAISE EXCEPTION 'Tenant % not found',
p_tenant_id;
END IF;
-- Insert product
EXECUTE format(
    '
    INSERT INTO %I.productos (nombre, precio, nota)
    VALUES ($1, $2, $3)
    RETURNING id
  ',
    v_schema_name
) INTO v_producto_id USING p_nombre,
p_precio,
p_nota;
-- If recipe provided, create recipe and items
IF p_receta IS NOT NULL
AND jsonb_array_length(p_receta) > 0 THEN -- Create recipe
EXECUTE format(
    '
      INSERT INTO %I.recetas (producto_id, nota)
      VALUES ($1, NULL)
      RETURNING id
    ',
    v_schema_name
) INTO v_receta_id USING v_producto_id;
-- Insert recipe items
FOR v_item IN
SELECT *
FROM jsonb_array_elements(p_receta) LOOP EXECUTE format(
        '
        INSERT INTO %I.receta_insumo (receta_id, insumo_id, cantidad, nota)
        VALUES ($1, $2, $3, NULL)
      ',
        v_schema_name
    ) USING v_receta_id,
    (v_item->>'insumo_id')::bigint,
    (v_item->>'cantidad')::numeric;
END LOOP;
END IF;
RETURN jsonb_build_object(
    'producto_id',
    v_producto_id,
    'nombre',
    p_nombre,
    'precio',
    p_precio
);
END;
$$;
REVOKE ALL ON FUNCTION public.create_tenant_product(bigint, varchar, numeric, varchar, jsonb)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_tenant_product(bigint, varchar, numeric, varchar, jsonb) TO service_role;
-- ============================================================
-- UPDATE TENANT PRODUCT
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_tenant_product(
        p_tenant_id bigint,
        p_producto_id bigint,
        p_nombre varchar(30) DEFAULT NULL,
        p_precio numeric(10, 3) DEFAULT NULL,
        p_nota varchar(100) DEFAULT NULL,
        p_receta jsonb DEFAULT NULL
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_schema_name text;
v_receta_id bigint;
v_item jsonb;
BEGIN -- Get schema name from tenant
SELECT schema_name INTO v_schema_name
FROM public.tenants
WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL;
IF v_schema_name IS NULL THEN RAISE EXCEPTION 'Tenant % not found',
p_tenant_id;
END IF;
-- Update product fields if provided
EXECUTE format(
    '
    UPDATE %I.productos
    SET
      nombre = COALESCE($1, nombre),
      precio = COALESCE($2, precio),
      nota = COALESCE($3, nota)
    WHERE id = $4
  ',
    v_schema_name
) USING p_nombre,
p_precio,
p_nota,
p_producto_id;
-- If recipe provided, recreate recipe items
IF p_receta IS NOT NULL THEN -- Get existing recipe id or create new one
EXECUTE format(
    '
      SELECT id FROM %I.recetas WHERE producto_id = $1
    ',
    v_schema_name
) INTO v_receta_id USING p_producto_id;
IF v_receta_id IS NULL THEN EXECUTE format(
    '
        INSERT INTO %I.recetas (producto_id, nota)
        VALUES ($1, NULL)
        RETURNING id
      ',
    v_schema_name
) INTO v_receta_id USING p_producto_id;
ELSE -- Clear existing recipe items
EXECUTE format(
    '
        DELETE FROM %I.receta_insumo WHERE receta_id = $1
      ',
    v_schema_name
) USING v_receta_id;
END IF;
-- Insert new recipe items
FOR v_item IN
SELECT *
FROM jsonb_array_elements(p_receta) LOOP EXECUTE format(
        '
        INSERT INTO %I.receta_insumo (receta_id, insumo_id, cantidad, nota)
        VALUES ($1, $2, $3, NULL)
      ',
        v_schema_name
    ) USING v_receta_id,
    (v_item->>'insumo_id')::bigint,
    (v_item->>'cantidad')::numeric;
END LOOP;
END IF;
RETURN jsonb_build_object('updated', true, 'producto_id', p_producto_id);
END;
$$;
REVOKE ALL ON FUNCTION public.update_tenant_product(bigint, bigint, varchar, numeric, varchar, jsonb)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_tenant_product(bigint, bigint, varchar, numeric, varchar, jsonb) TO service_role;
-- ============================================================
-- DELETE TENANT PRODUCT
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_tenant_product(
        p_tenant_id bigint,
        p_producto_id bigint
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_schema_name text;
BEGIN -- Get schema name from tenant
SELECT schema_name INTO v_schema_name
FROM public.tenants
WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL;
IF v_schema_name IS NULL THEN RAISE EXCEPTION 'Tenant % not found',
p_tenant_id;
END IF;
-- Delete product (cascade will handle recetas and receta_insumo)
EXECUTE format(
    '
    DELETE FROM %I.productos WHERE id = $1
  ',
    v_schema_name
) USING p_producto_id;
RETURN jsonb_build_object('deleted', true, 'producto_id', p_producto_id);
END;
$$;
REVOKE ALL ON FUNCTION public.delete_tenant_product(bigint, bigint)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_tenant_product(bigint, bigint) TO service_role;