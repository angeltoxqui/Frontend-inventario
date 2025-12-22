import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Venta, VentaCreate, VentaPublic, VentasPublic, VentaPago,
    DetalleVenta, DetalleVentaCreate, DetalleVentaPublic,
    Producto, Insumo
)

router = APIRouter(prefix="/ventas", tags=["ventas"])

@router.post("/", response_model=VentaPublic)
def crear_venta(
    *, session: SessionDep, current_user: CurrentUser, venta_in: VentaCreate
) -> Any:
    """
    MESERO: Crear comanda y descontar inventario.
    """
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

    total_calculado = 0.0
    detalles_respuesta = []

    for item in venta_in.detalles:
        producto = session.get(Producto, item.producto_id)
        if not producto:
            raise HTTPException(status_code=404, detail=f"Producto {item.producto_id} no encontrado")
        
        # Descontar Inventario
        for receta in producto.recetas:
            if receta.insumo:
                cantidad_a_descontar = receta.cantidad_requerida * item.cantidad
                receta.insumo.stock_actual -= cantidad_a_descontar
                session.add(receta.insumo)

        subtotal = producto.precio * item.cantidad
        total_calculado += subtotal

        detalle = DetalleVenta(
            venta_id=venta.id,
            producto_id=producto.id,
            cantidad=item.cantidad,
            precio_unitario=producto.precio,
            subtotal=subtotal
        )
        session.add(detalle)
        
        detalles_respuesta.append(DetalleVentaPublic(
            cantidad=item.cantidad, precio_unitario=producto.precio,
            subtotal=subtotal, producto_nombre=producto.nombre
        ))

    venta.total = total_calculado
    venta.total_final = total_calculado # Inicialmente sin propina
    session.add(venta)
    session.commit()
    session.refresh(venta)

    return VentaPublic(
        id=venta.id, mesa=venta.mesa, estado=venta.estado, 
        total=venta.total, total_final=venta.total_final, 
        fecha=venta.fecha, detalles=detalles_respuesta
    )

@router.put("/{venta_id}/marcar-listo", response_model=VentaPublic)
def marcar_pedido_listo(
    venta_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    COCINA: Marcar pedido como listo para entregar/cobrar.
    """
    venta = session.get(Venta, venta_id)
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    if venta.estado != "pendiente":
        raise HTTPException(status_code=400, detail="El pedido no está pendiente")

    venta.estado = "listo"
    session.add(venta)
    session.commit()
    session.refresh(venta)
    
    # Reconstrucción de respuesta (simplificada)
    detalles_fmt = [
        DetalleVentaPublic(
            cantidad=d.cantidad, precio_unitario=d.precio_unitario, 
            subtotal=d.subtotal, producto_nombre=d.producto.nombre
        ) for d in venta.detalles if d.producto
    ]

    return VentaPublic(
        id=venta.id, mesa=venta.mesa, estado=venta.estado, 
        total=venta.total, total_final=venta.total_final,
        fecha=venta.fecha, detalles=detalles_fmt
    )

@router.put("/{venta_id}/pagar", response_model=VentaPublic)
def pagar_venta(
    venta_id: uuid.UUID, pago_in: VentaPago, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    CAJA: Cobrar venta + Propina Voluntaria.
    """
    venta = session.get(Venta, venta_id)
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    if venta.estado == "pagado":
        raise HTTPException(status_code=400, detail="Esta venta ya está pagada")

    venta.estado = "pagado"
    venta.metodo_pago = pago_in.metodo_pago
    venta.propina = pago_in.propina
    venta.total_final = venta.total + pago_in.propina # Sumar propina al total final
    
    session.add(venta)
    session.commit()
    session.refresh(venta)
    
    detalles_fmt = [
        DetalleVentaPublic(
            cantidad=d.cantidad, precio_unitario=d.precio_unitario, 
            subtotal=d.subtotal, producto_nombre=d.producto.nombre
        ) for d in venta.detalles if d.producto
    ]

    return VentaPublic(
        id=venta.id, mesa=venta.mesa, estado=venta.estado, 
        total=venta.total, propina=venta.propina, total_final=venta.total_final,
        fecha=venta.fecha, metodo_pago=venta.metodo_pago,
        detalles=detalles_fmt
    )

@router.get("/", response_model=VentasPublic)
def leer_ventas(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    count = session.exec(select(func.count()).select_from(Venta)).one()
    statement = select(Venta).offset(skip).limit(limit).order_by(Venta.fecha.desc())
    ventas = session.exec(statement).all()

    data = []
    for v in ventas:
        detalles_fmt = [
            DetalleVentaPublic(
                cantidad=d.cantidad, precio_unitario=d.precio_unitario, 
                subtotal=d.subtotal, producto_nombre=d.producto.nombre if d.producto else "Borrado"
            ) for d in v.detalles
        ]
        data.append(VentaPublic(
            id=v.id, mesa=v.mesa, estado=v.estado, 
            total=v.total, propina=v.propina, total_final=v.total_final,
            fecha=v.fecha, metodo_pago=v.metodo_pago,
            detalles=detalles_fmt
        ))

    return VentasPublic(data=data, count=count)