import uuid
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select, SQLModel

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Venta, VentaCreate, VentaPublic, VentasPublic, VentaPago,
    DetalleVenta, DetalleVentaPublic,
    Producto, User
)

router = APIRouter(prefix="/ventas", tags=["ventas"])

class ItemDivision(SQLModel):
    detalle_id: uuid.UUID
    comensal: str

class DivisionCuenta(SQLModel):
    asignaciones: list[ItemDivision]

# ==============================================================================
# 🚨 ZONA DE REPORTES (DEBEN IR PRIMERO - NO MOVER DE AQUÍ) 🚨
# ==============================================================================

@router.get("/reporte/resumen")
def reporte_ventas_kpi(session: SessionDep, current_user: CurrentUser) -> Any:
    # Solo cuenta ventas PAGADAS del día de HOY
    hoy = datetime.utcnow().date()
    ventas = [v for v in session.exec(select(Venta)).all() if v.fecha.date() == hoy and v.estado == 'pagado']
    
    return {
        "ventas_netas": sum(v.total for v in ventas),
        "propinas": sum(v.propina for v in ventas),
        "total_caja": sum(v.total_final for v in ventas),
        "pedidos_hoy": len(ventas),
        "historial_reciente": [{"mesa": v.mesa, "total": v.total_final, "metodo": v.metodo_pago, "cliente": v.cliente_nombre} for v in ventas]
    }

@router.get("/reporte/avanzado")
def reporte_avanzado(session: SessionDep, current_user: CurrentUser) -> Any:
    # Solo analiza ventas PAGADAS históricas
    ventas_pagadas = session.exec(select(Venta).where(Venta.estado == 'pagado')).all()
    
    total_ingresos = sum(v.total for v in ventas_pagadas)
    total_descuentos = sum((v.total * v.descuento_porcentaje / 100) for v in ventas_pagadas)
    
    costo_total_insumos = 0
    productos_vendidos = {} 
    trabajadores = {}

    # Analizar detalles para Staff y Top Productos
    detalles = session.exec(select(DetalleVenta).join(Venta).where(Venta.estado == 'pagado')).all()
    
    for d in detalles:
        # Top Productos
        nom = d.producto.nombre if d.producto else "Producto Eliminado"
        productos_vendidos[nom] = productos_vendidos.get(nom, 0) + d.cantidad
        
        # Costos
        if d.producto:
            costo_plato = 0
            for r in d.producto.recetas:
                if r.insumo:
                    costo_plato += (r.insumo.costo * r.cantidad_requerida)
            costo_total_insumos += (costo_plato * d.cantidad)

    # Analizar Staff
    for v in ventas_pagadas:
        u_nombre = v.usuario.full_name if v.usuario else "Sin Asignar"
        if u_nombre not in trabajadores: trabajadores[u_nombre] = {"ventas": 0, "total": 0}
        trabajadores[u_nombre]["ventas"] += 1
        trabajadores[u_nombre]["total"] += v.total_final

    utilidad_bruta = total_ingresos - total_descuentos - costo_total_insumos
    margen = (utilidad_bruta / total_ingresos * 100) if total_ingresos > 0 else 0
    
    # Ordenar Top 5
    top_prods = sorted(productos_vendidos.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "pnl": {
            "ingresos_brutos": total_ingresos,
            "descuentos_dados": total_descuentos,
            "costos_insumos": costo_total_insumos,
            "utilidad_bruta": utilidad_bruta,
            "margen_porcentaje": round(margen, 2)
        },
        "trabajadores": [{"nombre": k, "pedidos": v["ventas"], "dinero": v["total"]} for k,v in trabajadores.items()],
        "top_productos": [{"nombre": k, "cantidad": v} for k,v in top_prods]
    }

@router.get("/reporte/graficos")
def obtener_datos_graficos(session: SessionDep, current_user: CurrentUser) -> Any:
    # Gráfico últimos 7 días
    hoy = datetime.utcnow().date()
    inicio = hoy - timedelta(days=6)
    
    ventas = [v for v in session.exec(select(Venta).where(Venta.estado == 'pagado')).all() if v.fecha.date() >= inicio]
    
    datos = { (inicio + timedelta(days=i)).strftime("%d-%m"): 0.0 for i in range(7) }
    
    for v in ventas:
        d = v.fecha.date().strftime("%d-%m")
        if d in datos: datos[d] += v.total_final
        
    return {
        "grafico_ventas": {
            "categorias": list(datos.keys()),
            "data": list(datos.values())
        }
    }

# ==============================================================================
# 🟢 RUTAS OPERATIVAS (VAN DESPUÉS)
# ==============================================================================

@router.post("/", response_model=VentaPublic)
def crear_venta(*, session: SessionDep, current_user: CurrentUser, venta_in: VentaCreate) -> Any:
    # Verificar turno, excepto si es admin
    if not current_user.en_turno and not current_user.rol == "admin" and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="No estás activo en turno.")

    # Buscar si ya hay venta abierta en esa mesa
    query = select(Venta).where(Venta.mesa == venta_in.mesa).where(Venta.estado.in_(["pendiente", "listo", "entregado", "por_cobrar"]))
    venta = session.exec(query).first()

    if not venta:
        venta = Venta(mesa=venta_in.mesa, estado="pendiente", usuario_id=current_user.id, fecha=datetime.utcnow(), total=0.0)
        session.add(venta); session.commit(); session.refresh(venta)
    else:
        # Si estaba lista/entregada y agregan más cosas, vuelve a pendiente (cocina)
        if venta.estado in ["listo", "entregado", "por_cobrar"]: venta.estado = "pendiente"

    total_adicional = 0.0
    for item in venta_in.detalles:
        producto = session.get(Producto, item.producto_id)
        if not producto: continue
        
        # Descontar inventario y generar receta snapshot
        lista_ingredientes = []
        for receta in producto.recetas:
            if receta.insumo:
                receta.insumo.stock_actual -= (receta.cantidad_requerida * item.cantidad)
                session.add(receta.insumo)
                lista_ingredientes.append(f"{receta.insumo.nombre} ({receta.cantidad_requerida}{receta.insumo.unidad_medida})")
        
        receta_texto = ", ".join(lista_ingredientes)
        subtotal = producto.precio * item.cantidad
        total_adicional += subtotal

        detalle = DetalleVenta(
            venta_id=venta.id, producto_id=producto.id, cantidad=item.cantidad,
            precio_unitario=producto.precio, subtotal=subtotal, comensal="Mesa",
            notas=item.notas, receta_snapshot=receta_texto
        )
        session.add(detalle); session.commit(); session.refresh(detalle)

    venta.total += total_adicional
    venta.total_final = venta.total + venta.propina 
    session.add(venta); session.commit(); session.refresh(venta)
    return construir_respuesta(venta)

@router.put("/{venta_id}/marcar-listo", response_model=VentaPublic)
def marcar_pedido_listo(venta_id: uuid.UUID, session: SessionDep, current_user: CurrentUser) -> Any:
    venta = session.get(Venta, venta_id)
    if not venta: raise HTTPException(status_code=404)
    venta.estado = "listo"; session.add(venta); session.commit()
    return construir_respuesta(venta)

@router.post("/{venta_id}/entregar_mesa", response_model=VentaPublic)
def entregar_pedido_mesa(venta_id: uuid.UUID, session: SessionDep, current_user: CurrentUser) -> Any:
    venta = session.get(Venta, venta_id)
    if not venta: raise HTTPException(status_code=404)
    venta.estado = "entregado"; session.add(venta); session.commit()
    return construir_respuesta(venta)

@router.post("/{venta_id}/dividir_por_nombres", response_model=VentaPublic)
def dividir_cuenta_nombres(venta_id: uuid.UUID, division: DivisionCuenta, session: SessionDep, current_user: CurrentUser) -> Any:
    venta = session.get(Venta, venta_id)
    if not venta: raise HTTPException(status_code=404)
    for item in division.asignaciones:
        det = session.get(DetalleVenta, item.detalle_id)
        if det and det.venta_id == venta.id:
            det.comensal = item.comensal; session.add(det)
    venta.estado = "por_cobrar"; venta.tipo_cuenta = "separada"
    session.add(venta); session.commit(); session.refresh(venta)
    return construir_respuesta(venta)

@router.post("/{venta_id}/solicitar_cuenta", response_model=VentaPublic)
def solicitar_cuenta(venta_id: uuid.UUID, session: SessionDep, current_user: CurrentUser, tipo: str = Query("unica")) -> Any:
    venta = session.get(Venta, venta_id)
    if not venta: raise HTTPException(status_code=404)
    venta.estado = "por_cobrar"; venta.tipo_cuenta = tipo
    session.add(venta); session.commit()
    return construir_respuesta(venta)

@router.put("/{venta_id}/pagar_v2", response_model=VentaPublic)
def pagar_venta(venta_id: uuid.UUID, pago_in: VentaPago, session: SessionDep, current_user: CurrentUser) -> Any:
    venta = session.get(Venta, venta_id)
    if not venta: raise HTTPException(status_code=404)
    
    if pago_in.items_a_pagar and len(pago_in.items_a_pagar) > 0:
        return procesar_pago_parcial(venta, pago_in, session)
    
    venta.estado = "pagado"
    venta.metodo_pago = pago_in.metodo_pago
    venta.descuento_porcentaje = pago_in.descuento
    venta.propina = pago_in.propina
    
    # Calcular totales finales
    subtotal_con_descuento = venta.total - (venta.total * pago_in.descuento / 100)
    venta.total_final = subtotal_con_descuento + pago_in.propina
    
    venta.cliente_nombre = pago_in.cliente_nombre; venta.cliente_nit = pago_in.cliente_nit
    venta.cliente_email = pago_in.cliente_email; venta.cliente_telefono = pago_in.cliente_telefono
    
    session.add(venta); session.commit(); session.refresh(venta)
    return construir_respuesta(venta)

def procesar_pago_parcial(venta_origen: Venta, pago: VentaPago, session):
    nueva_venta = Venta(
        mesa=venta_origen.mesa, estado="pagado", usuario_id=venta_origen.usuario_id, fecha=datetime.utcnow(),
        tipo_cuenta="separada-pagada", metodo_pago=pago.metodo_pago, propina=pago.propina,
        descuento_porcentaje=pago.descuento,
        cliente_nombre=pago.cliente_nombre, cliente_nit=pago.cliente_nit, cliente_email=pago.cliente_email, cliente_telefono=pago.cliente_telefono
    )
    session.add(nueva_venta); session.commit(); session.refresh(nueva_venta)
    
    total_movido = 0.0
    for detalle_id in pago.items_a_pagar:
        detalle = session.get(DetalleVenta, detalle_id)
        if detalle and detalle.venta_id == venta_origen.id:
            detalle.venta_id = nueva_venta.id; total_movido += detalle.subtotal; session.add(detalle)
    
    subtotal_hija_desc = total_movido - (total_movido * pago.descuento / 100)
    nueva_venta.total = total_movido; nueva_venta.total_final = subtotal_hija_desc + pago.propina
    venta_origen.total -= total_movido; venta_origen.total_final = venta_origen.total 
    
    restantes = session.exec(select(func.count()).where(DetalleVenta.venta_id == venta_origen.id)).one()
    if restantes == 0: venta_origen.estado = "cerrado_split"
    
    session.add(nueva_venta); session.add(venta_origen); session.commit()
    return construir_respuesta(nueva_venta)

@router.get("/", response_model=VentasPublic)
def leer_ventas(session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100) -> Any:
    # OJO: Este endpoint atrapa todo lo que no sea 'reporte'
    s = select(Venta).where(Venta.estado != "cerrado_split").offset(skip).limit(limit).order_by(Venta.fecha.desc())
    ventas = session.exec(s).all()
    return VentasPublic(data=[construir_respuesta(v) for v in ventas], count=len(ventas))

def construir_respuesta(venta: Venta) -> VentaPublic:
    det = [DetalleVentaPublic(id=d.id, cantidad=d.cantidad, precio_unitario=d.precio_unitario, subtotal=d.subtotal, producto_nombre=d.producto.nombre if d.producto else "???", comensal=d.comensal, notas=d.notas, receta_snapshot=d.receta_snapshot) for d in venta.detalles]
    return VentaPublic(id=venta.id, mesa=venta.mesa, estado=venta.estado, tipo_cuenta=venta.tipo_cuenta, total=venta.total, descuento_porcentaje=venta.descuento_porcentaje, propina=venta.propina, total_final=venta.total_final, fecha=venta.fecha, metodo_pago=venta.metodo_pago, cliente_nombre=venta.cliente_nombre, cliente_nit=venta.cliente_nit, cliente_email=venta.cliente_email, cliente_telefono=venta.cliente_telefono, detalles=det)