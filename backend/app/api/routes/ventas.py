import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select, SQLModel

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Venta, VentaCreate, VentaPublic, VentasPublic, VentaPago,
    DetalleVenta, DetalleVentaPublic,
    Producto
)

router = APIRouter(prefix="/ventas", tags=["ventas"])

# --- ESQUEMAS PARA DIVISIÓN DE CUENTA ---
class ItemDivision(SQLModel):
    detalle_id: uuid.UUID
    comensal: str

class DivisionCuenta(SQLModel):
    asignaciones: list[ItemDivision]

# -----------------------------------------------------------------------------
# 1. CREAR VENTA (MESERO -> COCINA) CON LÓGICA DE CARRITO
# -----------------------------------------------------------------------------
@router.post("/", response_model=VentaPublic)
def crear_venta(
    *, session: SessionDep, current_user: CurrentUser, venta_in: VentaCreate
) -> Any:
    """
    Crea una venta nueva o agrega productos a una existente (Carrito).
    """
    # Buscar si ya existe venta activa para esa mesa
    query = select(Venta).where(Venta.mesa == venta_in.mesa).where(Venta.estado.in_(["pendiente", "listo", "entregado", "por_cobrar"]))
    venta = session.exec(query).first()

    if not venta:
        venta = Venta(
            mesa=venta_in.mesa,
            estado="pendiente",
            usuario_id=current_user.id,
            fecha=datetime.utcnow(),
            total=0.0 
        )
        session.add(venta)
        session.commit()
        session.refresh(venta)
    else:
        # Si piden más cosas, la mesa vuelve a estado 'pendiente' (cocina)
        if venta.estado in ["listo", "entregado", "por_cobrar"]:
            venta.estado = "pendiente"

    total_adicional = 0.0
    detalles_respuesta = []

    for item in venta_in.detalles:
        producto = session.get(Producto, item.producto_id)
        if not producto:
            continue
        
        # Descontar Inventario
        for receta in producto.recetas:
            if receta.insumo:
                receta.insumo.stock_actual -= (receta.cantidad_requerida * item.cantidad)
                session.add(receta.insumo)

        subtotal = producto.precio * item.cantidad
        total_adicional += subtotal

        detalle = DetalleVenta(
            venta_id=venta.id,
            producto_id=producto.id,
            cantidad=item.cantidad,
            precio_unitario=producto.precio,
            subtotal=subtotal,
            comensal="Mesa" # Por defecto
        )
        session.add(detalle)
        session.commit() 
        session.refresh(detalle)
        
        detalles_respuesta.append(DetalleVentaPublic(
            id=detalle.id,
            cantidad=item.cantidad, 
            precio_unitario=producto.precio,
            subtotal=subtotal, 
            producto_nombre=producto.nombre,
            comensal=detalle.comensal
        ))

    venta.total += total_adicional
    venta.total_final = venta.total 
    session.add(venta)
    session.commit()
    session.refresh(venta)

    return construir_respuesta(venta)

# -----------------------------------------------------------------------------
# 2. CICLO DE VIDA (COCINA -> ENTREGA)
# -----------------------------------------------------------------------------
@router.put("/{venta_id}/marcar-listo", response_model=VentaPublic)
def marcar_pedido_listo(venta_id: uuid.UUID, session: SessionDep, current_user: CurrentUser) -> Any:
    venta = session.get(Venta, venta_id)
    if not venta: raise HTTPException(status_code=404)
    venta.estado = "listo"
    session.add(venta)
    session.commit()
    return construir_respuesta(venta)

@router.post("/{venta_id}/entregar_mesa", response_model=VentaPublic)
def entregar_pedido_mesa(venta_id: uuid.UUID, session: SessionDep, current_user: CurrentUser) -> Any:
    venta = session.get(Venta, venta_id)
    if not venta: raise HTTPException(status_code=404)
    venta.estado = "entregado"
    session.add(venta)
    session.commit()
    return construir_respuesta(venta)

# -----------------------------------------------------------------------------
# 3. GESTIÓN DE CUENTA (DIVIDIR Y SOLICITAR)
# -----------------------------------------------------------------------------

@router.post("/{venta_id}/dividir_por_nombres", response_model=VentaPublic)
def dividir_cuenta_nombres(
    venta_id: uuid.UUID, division: DivisionCuenta, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Asigna nombres de comensales a los items de una venta.
    """
    venta = session.get(Venta, venta_id)
    if not venta: raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    # Actualizar dueños de los items
    for item in division.asignaciones:
        detalle = session.get(DetalleVenta, item.detalle_id)
        if detalle and detalle.venta_id == venta.id:
            detalle.comensal = item.comensal
            session.add(detalle)
    
    # Marcar venta como separada y lista para cobrar
    venta.estado = "por_cobrar"
    venta.tipo_cuenta = "separada"
    
    session.add(venta)
    session.commit()
    session.refresh(venta)
    return construir_respuesta(venta)

@router.post("/{venta_id}/solicitar_cuenta", response_model=VentaPublic)
def solicitar_cuenta(
    venta_id: uuid.UUID, session: SessionDep, current_user: CurrentUser, 
    tipo: str = Query("unica")
) -> Any:
    venta = session.get(Venta, venta_id)
    if not venta: raise HTTPException(status_code=404)
    
    venta.estado = "por_cobrar"
    venta.tipo_cuenta = tipo
    session.add(venta)
    session.commit()
    return construir_respuesta(venta)

# -----------------------------------------------------------------------------
# 4. CAJA Y PAGOS
# -----------------------------------------------------------------------------
@router.put("/{venta_id}/pagar_v2", response_model=VentaPublic)
def pagar_venta(
    venta_id: uuid.UUID, pago_in: VentaPago, session: SessionDep, current_user: CurrentUser
) -> Any:
    venta = session.get(Venta, venta_id)
    if not venta: raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    # Pago Parcial (Items específicos)
    if pago_in.items_a_pagar and len(pago_in.items_a_pagar) > 0:
        return procesar_pago_parcial(venta, pago_in, session)
    
    # Pago Total
    venta.estado = "pagado"
    venta.metodo_pago = pago_in.metodo_pago
    venta.propina = pago_in.propina
    venta.total_final = venta.total + pago_in.propina
    
    # Datos Facturación
    venta.cliente_nombre = pago_in.cliente_nombre
    venta.cliente_nit = pago_in.cliente_nit
    venta.cliente_email = pago_in.cliente_email
    venta.cliente_telefono = pago_in.cliente_telefono
    
    session.add(venta)
    session.commit()
    session.refresh(venta)
    return construir_respuesta(venta)

def procesar_pago_parcial(venta_origen: Venta, pago: VentaPago, session):
    """Mueve items a una nueva venta pagada y resta de la original"""
    
    nueva_venta = Venta(
        mesa=venta_origen.mesa,
        estado="pagado",
        usuario_id=venta_origen.usuario_id,
        fecha=datetime.utcnow(),
        tipo_cuenta="separada-pagada",
        metodo_pago=pago.metodo_pago,
        propina=pago.propina,
        cliente_nombre=pago.cliente_nombre,
        cliente_nit=pago.cliente_nit,
        cliente_email=pago.cliente_email,
        cliente_telefono=pago.cliente_telefono
    )
    session.add(nueva_venta)
    session.commit()
    session.refresh(nueva_venta)
    
    total_movido = 0.0
    
    for detalle_id in pago.items_a_pagar:
        detalle = session.get(DetalleVenta, detalle_id)
        if detalle and detalle.venta_id == venta_origen.id:
            detalle.venta_id = nueva_venta.id
            total_movido += detalle.subtotal
            session.add(detalle)
            
    nueva_venta.total = total_movido
    nueva_venta.total_final = total_movido + pago.propina
    
    venta_origen.total -= total_movido
    venta_origen.total_final = venta_origen.total
    
    # Si la original queda vacía, la cerramos
    restantes = session.exec(select(func.count()).where(DetalleVenta.venta_id == venta_origen.id)).one()
    if restantes == 0:
        venta_origen.estado = "cerrado_split"
    
    session.add(nueva_venta)
    session.add(venta_origen)
    session.commit()
    
    return construir_respuesta(nueva_venta)

# -----------------------------------------------------------------------------
# 5. LISTADOS Y REPORTES
# -----------------------------------------------------------------------------
@router.get("/", response_model=VentasPublic)
def leer_ventas(session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100) -> Any:
    statement = select(Venta).where(Venta.estado != "cerrado_split").offset(skip).limit(limit).order_by(Venta.fecha.desc())
    ventas = session.exec(statement).all()
    count = len(ventas)
    data = [construir_respuesta(v) for v in ventas]
    return VentasPublic(data=data, count=count)

@router.get("/reporte/resumen")
def reporte_ventas(session: SessionDep, current_user: CurrentUser) -> Any:
    if current_user.rol not in ["admin", "cajero"] and not current_user.is_superuser:
        raise HTTPException(status_code=403)

    hoy = datetime.utcnow().date()
    ventas_hoy = [v for v in session.exec(select(Venta)).all() if v.fecha.date() == hoy and v.estado == 'pagado']
    total_hoy = sum(v.total_final for v in ventas_hoy)
    
    todos = session.exec(select(DetalleVenta)).all()
    conteo = {}
    for d in todos:
        if d.producto:
            conteo[d.producto.nombre] = conteo.get(d.producto.nombre, 0) + d.cantidad
            
    return {
        "ventas_hoy": total_hoy,
        "pedidos_hoy": len(ventas_hoy),
        "top_productos": [{"nombre": k, "cantidad": v} for k,v in sorted(conteo.items(), key=lambda x:x[1], reverse=True)[:5]],
        "historial_reciente": [
            {"id": str(v.id), "mesa": v.mesa, "total": v.total_final, "metodo": v.metodo_pago} 
            for v in ventas_hoy
        ]
    }

def construir_respuesta(venta: Venta) -> VentaPublic:
    detalles_fmt = [
        DetalleVentaPublic(
            id=d.id,
            cantidad=d.cantidad, precio_unitario=d.precio_unitario, 
            subtotal=d.subtotal, producto_nombre=d.producto.nombre if d.producto else "???",
            comensal=d.comensal
        ) for d in venta.detalles
    ]
    return VentaPublic(
        id=venta.id, mesa=venta.mesa, estado=venta.estado, tipo_cuenta=venta.tipo_cuenta,
        total=venta.total, propina=venta.propina, total_final=venta.total_final,
        fecha=venta.fecha, metodo_pago=venta.metodo_pago,
        cliente_nombre=venta.cliente_nombre, cliente_nit=venta.cliente_nit,
        cliente_email=venta.cliente_email, cliente_telefono=venta.cliente_telefono,
        detalles=detalles_fmt
    )