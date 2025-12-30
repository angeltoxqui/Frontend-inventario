import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Producto, ProductoCreate, ProductoPublic, ProductosPublic, 
    Receta, RecetaPublic, Message, Insumo
)

router = APIRouter(prefix="/productos", tags=["productos"])

# --- AJUSTE: Incluimos insumo_id en la respuesta ---
class RecetaPublicConID(RecetaPublic):
    insumo_id: uuid.UUID

class ProductoPublicFull(ProductoPublic):
    recetas: list[RecetaPublicConID]

@router.get("/", response_model=ProductosPublic)
def read_productos(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve products with recipes.
    """
    count_statement = select(func.count()).select_from(Producto)
    count = session.exec(count_statement).one()
    statement = select(Producto).offset(skip).limit(limit)
    productos = session.exec(statement).all()
    
    resultados = []
    for prod in productos:
        recetas_fmt = [
            RecetaPublicConID(
                insumo_id=r.insumo_id, # <--- ¡IMPORTANTE PARA EDITAR!
                insumo_nombre=r.insumo.nombre,
                insumo_medida=r.insumo.unidad_medida,
                cantidad_requerida=r.cantidad_requerida
            ) for r in prod.recetas
        ]
        resultados.append(ProductoPublicFull(
            id=prod.id,
            nombre=prod.nombre,
            precio=prod.precio,
            descripcion=prod.descripcion,
            categoria=prod.categoria,
            imagen_url=prod.imagen_url,
            recetas=recetas_fmt
        ))

    return ProductosPublic(data=resultados, count=count)

@router.post("/", response_model=ProductoPublic)
def create_producto(
    *, session: SessionDep, current_user: CurrentUser, producto_in: ProductoCreate
) -> Any:
    # 1. Crear Producto
    producto = Producto(
        nombre=producto_in.nombre,
        precio=producto_in.precio,
        descripcion=producto_in.descripcion,
        imagen_url=producto_in.imagen_url,
        categoria=producto_in.categoria
    )
    session.add(producto)
    session.commit()
    session.refresh(producto)

    # 2. Crear Receta
    recetas_creadas = []
    for ingrediente in producto_in.ingredientes:
        insumo = session.get(Insumo, ingrediente.insumo_id)
        if not insumo:
            raise HTTPException(status_code=404, detail=f"Insumo {ingrediente.insumo_id} no encontrado")
            
        receta = Receta(
            producto_id=producto.id,
            insumo_id=insumo.id,
            cantidad_requerida=ingrediente.cantidad_requerida
        )
        session.add(receta)
        recetas_creadas.append(RecetaPublic(insumo_nombre=insumo.nombre, insumo_medida=insumo.unidad_medida, cantidad_requerida=ingrediente.cantidad_requerida))
    
    session.commit()
    return ProductoPublic(id=producto.id, nombre=producto.nombre, precio=producto.precio, descripcion=producto.descripcion, categoria=producto.categoria, recetas=recetas_creadas)

# --- NUEVO: Endpoint para EDITAR Producto (PUT) ---
@router.put("/{id}", response_model=ProductoPublic)
def update_producto(
    *, session: SessionDep, current_user: CurrentUser, id: uuid.UUID, producto_in: ProductoCreate
) -> Any:
    """
    Update a product and its recipe completely.
    """
    producto = session.get(Producto, id)
    if not producto:
        raise HTTPException(status_code=404, detail="Product not found")

    # 1. Actualizar datos básicos
    producto.nombre = producto_in.nombre
    producto.precio = producto_in.precio
    producto.descripcion = producto_in.descripcion
    producto.categoria = producto_in.categoria
    producto.imagen_url = producto_in.imagen_url
    
    session.add(producto)
    
    # 2. Actualizar Receta (Estrategia: Borrar viejas -> Crear nuevas)
    # Primero borramos las relaciones existentes
    statement = select(Receta).where(Receta.producto_id == id)
    recetas_viejas = session.exec(statement).all()
    for r in recetas_viejas:
        session.delete(r)
    
    # Creamos las nuevas
    recetas_nuevas = []
    for ingrediente in producto_in.ingredientes:
        insumo = session.get(Insumo, ingrediente.insumo_id)
        if not insumo:
            continue # Si un insumo fue borrado, lo saltamos
            
        receta = Receta(
            producto_id=producto.id,
            insumo_id=insumo.id,
            cantidad_requerida=ingrediente.cantidad_requerida
        )
        session.add(receta)
        recetas_nuevas.append(RecetaPublic(insumo_nombre=insumo.nombre, insumo_medida=insumo.unidad_medida, cantidad_requerida=ingrediente.cantidad_requerida))

    session.commit()
    session.refresh(producto)
    
    return ProductoPublic(id=producto.id, nombre=producto.nombre, precio=producto.precio, descripcion=producto.descripcion, categoria=producto.categoria, recetas=recetas_nuevas)

@router.delete("/{id}", response_model=Message)
def delete_producto(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    producto = session.get(Producto, id)
    if not producto:
        return Message(message="Product not found")
    session.delete(producto)
    session.commit()
    return Message(message="Product deleted successfully")