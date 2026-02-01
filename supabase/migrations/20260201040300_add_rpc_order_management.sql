-- Migration: Add RPC functions for Order Management
-- Provides operations for ordenes and detalle_orden tables within tenant schemas
-- ============================================================
-- GET TENANT ORDERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_tenant_orders(
        p_tenant_id bigint,
        p_estado varchar(30) DEFAULT NULL,
        p_mesa_id bigint DEFAULT NULL,
        p_limit integer DEFAULT 50,
        p_offset integer DEFAULT 0
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_schema_name text;
v_result jsonb;
v_where_clause text := '';
BEGIN
SELECT schema_name INTO v_schema_name
FROM public.tenants
WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL;
IF v_schema_name IS NULL THEN RAISE EXCEPTION 'Tenant % not found',
p_tenant_id;
END IF;
-- Build dynamic where clause
IF p_estado IS NOT NULL THEN v_where_clause := v_where_clause || format(' AND o.estado = %L', p_estado);
END IF;
IF p_mesa_id IS NOT NULL THEN v_where_clause := v_where_clause || format(' AND o.mesa_id = %s', p_mesa_id);
END IF;
EXECUTE format(
    '
    SELECT COALESCE(jsonb_agg(ord), ''[]''::jsonb)
    FROM (
      SELECT 
        o.id,
        o.mesa_id,
        m.nombre AS mesa_nombre,
        o.cliente_id,
        o.estado,
        o.fecha_creacion,
        o.total,
        o.propina,
        o.tipo_pago,
        o.es_factura_electronica,
        (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            ''id'', d.id,
            ''producto_id'', d.producto_id,
            ''producto_nombre'', p.nombre,
            ''cantidad'', d.cantidad,
            ''precio_unitario'', d.precio_unitario,
            ''subtotal'', d.subtotal,
            ''nota'', d.nota
          )), ''[]''::jsonb)
          FROM %I.detalle_orden d
          JOIN %I.productos p ON p.id = d.producto_id
          WHERE d.orden_id = o.id
        ) AS items
      FROM %I.ordenes o
      JOIN %I.mesas m ON m.id = o.mesa_id
      WHERE 1=1 %s
      ORDER BY o.fecha_creacion DESC
      LIMIT $1 OFFSET $2
    ) ord
  ',
    v_schema_name,
    v_schema_name,
    v_schema_name,
    v_schema_name,
    v_where_clause
) INTO v_result USING p_limit,
p_offset;
RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_tenant_orders(bigint, varchar, bigint, integer, integer)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_orders(bigint, varchar, bigint, integer, integer) TO service_role;
-- ============================================================
-- CREATE TENANT ORDER
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_tenant_order(
        p_tenant_id bigint,
        p_mesa_id bigint,
        p_cliente_id bigint DEFAULT NULL,
        p_items jsonb DEFAULT '[]'::jsonb
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_schema_name text;
v_orden_id bigint;
v_item jsonb;
v_precio numeric(10, 3);
v_total numeric(10, 3) := 0;
BEGIN
SELECT schema_name INTO v_schema_name
FROM public.tenants
WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL;
IF v_schema_name IS NULL THEN RAISE EXCEPTION 'Tenant % not found',
p_tenant_id;
END IF;
-- Create order
EXECUTE format(
    '
    INSERT INTO %I.ordenes (mesa_id, cliente_id, estado, total)
    VALUES ($1, $2, ''abierta'', 0)
    RETURNING id
  ',
    v_schema_name
) INTO v_orden_id USING p_mesa_id,
p_cliente_id;
-- Mark table as occupied
EXECUTE format(
    '
    UPDATE %I.mesas SET ocupada = true WHERE id = $1
  ',
    v_schema_name
) USING p_mesa_id;
-- Insert order items
FOR v_item IN
SELECT *
FROM jsonb_array_elements(p_items) LOOP -- Get product price
    EXECUTE format(
        '
      SELECT precio FROM %I.productos WHERE id = $1
    ',
        v_schema_name
    ) INTO v_precio USING (v_item->>'producto_id')::bigint;
IF v_precio IS NULL THEN RAISE EXCEPTION 'Product % not found',
v_item->>'producto_id';
END IF;
-- Insert item
EXECUTE format(
    '
      INSERT INTO %I.detalle_orden (orden_id, producto_id, cantidad, precio_unitario, subtotal, nota)
      VALUES ($1, $2, $3, $4, $5, $6)
    ',
    v_schema_name
) USING v_orden_id,
(v_item->>'producto_id')::bigint,
(v_item->>'cantidad')::integer,
v_precio,
v_precio * (v_item->>'cantidad')::integer,
v_item->>'nota';
v_total := v_total + (v_precio * (v_item->>'cantidad')::integer);
END LOOP;
-- Update order total
EXECUTE format(
    '
    UPDATE %I.ordenes SET total = $1 WHERE id = $2
  ',
    v_schema_name
) USING v_total,
v_orden_id;
RETURN jsonb_build_object(
    'orden_id',
    v_orden_id,
    'mesa_id',
    p_mesa_id,
    'total',
    v_total,
    'estado',
    'abierta'
);
END;
$$;
REVOKE ALL ON FUNCTION public.create_tenant_order(bigint, bigint, bigint, jsonb)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_tenant_order(bigint, bigint, bigint, jsonb) TO service_role;
-- ============================================================
-- UPDATE TENANT ORDER STATUS
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_tenant_order_status(
        p_tenant_id bigint,
        p_orden_id bigint,
        p_estado varchar(30)
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
    UPDATE %I.ordenes
    SET estado = $1
    WHERE id = $2
  ',
    v_schema_name
) USING p_estado,
p_orden_id;
RETURN jsonb_build_object(
    'updated',
    true,
    'orden_id',
    p_orden_id,
    'estado',
    p_estado
);
END;
$$;
REVOKE ALL ON FUNCTION public.update_tenant_order_status(bigint, bigint, varchar)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_tenant_order_status(bigint, bigint, varchar) TO service_role;
-- ============================================================
-- ADD ITEM TO TENANT ORDER
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_item_to_tenant_order(
        p_tenant_id bigint,
        p_orden_id bigint,
        p_producto_id bigint,
        p_cantidad integer,
        p_nota varchar(100) DEFAULT NULL
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_schema_name text;
v_precio numeric(10, 3);
v_subtotal numeric(10, 3);
v_detalle_id bigint;
BEGIN
SELECT schema_name INTO v_schema_name
FROM public.tenants
WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL;
IF v_schema_name IS NULL THEN RAISE EXCEPTION 'Tenant % not found',
p_tenant_id;
END IF;
-- Get product price
EXECUTE format(
    '
    SELECT precio FROM %I.productos WHERE id = $1
  ',
    v_schema_name
) INTO v_precio USING p_producto_id;
IF v_precio IS NULL THEN RAISE EXCEPTION 'Product % not found',
p_producto_id;
END IF;
v_subtotal := v_precio * p_cantidad;
-- Insert item
EXECUTE format(
    '
    INSERT INTO %I.detalle_orden (orden_id, producto_id, cantidad, precio_unitario, subtotal, nota)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  ',
    v_schema_name
) INTO v_detalle_id USING p_orden_id,
p_producto_id,
p_cantidad,
v_precio,
v_subtotal,
p_nota;
-- Update order total
EXECUTE format(
    '
    UPDATE %I.ordenes
    SET total = total + $1
    WHERE id = $2
  ',
    v_schema_name
) USING v_subtotal,
p_orden_id;
RETURN jsonb_build_object(
    'added',
    true,
    'detalle_id',
    v_detalle_id,
    'orden_id',
    p_orden_id,
    'subtotal',
    v_subtotal
);
END;
$$;
REVOKE ALL ON FUNCTION public.add_item_to_tenant_order(bigint, bigint, bigint, integer, varchar)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_item_to_tenant_order(bigint, bigint, bigint, integer, varchar) TO service_role;
-- ============================================================
-- PAY TENANT ORDER
-- ============================================================
CREATE OR REPLACE FUNCTION public.pay_tenant_order(
        p_tenant_id bigint,
        p_orden_id bigint,
        p_tipo_pago varchar(30),
        p_propina numeric(10, 3) DEFAULT 0,
        p_es_factura boolean DEFAULT false
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_schema_name text;
v_mesa_id bigint;
v_total numeric(10, 3);
BEGIN
SELECT schema_name INTO v_schema_name
FROM public.tenants
WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL;
IF v_schema_name IS NULL THEN RAISE EXCEPTION 'Tenant % not found',
p_tenant_id;
END IF;
-- Update order payment details
EXECUTE format(
    '
    UPDATE %I.ordenes
    SET 
      estado = ''pagada'',
      tipo_pago = $1,
      propina = $2,
      es_factura_electronica = $3
    WHERE id = $4
    RETURNING mesa_id, total
  ',
    v_schema_name
) INTO v_mesa_id,
v_total USING p_tipo_pago,
p_propina,
p_es_factura,
p_orden_id;
-- Check if table has other open orders, if not mark as free
EXECUTE format(
    '
    UPDATE %I.mesas
    SET ocupada = EXISTS(
      SELECT 1 FROM %I.ordenes 
      WHERE mesa_id = $1 AND estado NOT IN (''pagada'', ''cancelada'')
    )
    WHERE id = $1
  ',
    v_schema_name,
    v_schema_name
) USING v_mesa_id;
RETURN jsonb_build_object(
    'paid',
    true,
    'orden_id',
    p_orden_id,
    'total',
    v_total,
    'propina',
    p_propina,
    'tipo_pago',
    p_tipo_pago
);
END;
$$;
REVOKE ALL ON FUNCTION public.pay_tenant_order(bigint, bigint, varchar, numeric, boolean)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pay_tenant_order(bigint, bigint, varchar, numeric, boolean) TO service_role;