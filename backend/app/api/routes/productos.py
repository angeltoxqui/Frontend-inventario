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
    
    # Formatear respuesta manual para incluir recetas
    resultados = []
    for prod in productos:
        recetas_fmt = [
            RecetaPublic(
                insumo_nombre=r.insumo.nombre,
                insumo_medida=r.insumo.unidad_medida,
                cantidad_requerida=r.cantidad_requerida
            ) for r in prod.recetas
        ]
        resultados.append(ProductoPublic(
            id=prod.id,
            nombre=prod.nombre,
            precio=prod.precio,
            descripcion=prod.descripcion,
            recetas=recetas_fmt
        ))

    return ProductosPublic(data=resultados, count=count)

@router.post("/", response_model=ProductoPublic)
def create_producto(
    *, session: SessionDep, current_user: CurrentUser, producto_in: ProductoCreate
) -> Any:
    """
    Create new product with ingredients.
    """
    # 1. Crear Producto
    producto = Producto(
        nombre=producto_in.nombre,
        precio=producto_in.precio,
        descripcion=producto_in.descripcion,
        imagen_url=producto_in.imagen_url
    )
    session.add(producto)
    session.commit()
    session.refresh(producto)

    # 2. Crear Receta (Ingredientes)
    recetas_creadas = []
    for ingrediente in producto_in.ingredientes:
        # Verificar si existe el insumo
        insumo = session.get(Insumo, ingrediente.insumo_id)
        if not insumo:
            raise HTTPException(status_code=404, detail=f"Insumo {ingrediente.insumo_id} no encontrado")
            
        receta = Receta(
            producto_id=producto.id,
            insumo_id=insumo.id,
            cantidad_requerida=ingrediente.cantidad_requerida
        )
        session.add(receta)
        
        # Guardar para la respuesta
        recetas_creadas.append(RecetaPublic(
            insumo_nombre=insumo.nombre,
            insumo_medida=insumo.unidad_medida,
            cantidad_requerida=ingrediente.cantidad_requerida
        ))
    
    session.commit()

    return ProductoPublic(
        id=producto.id,
        nombre=producto.nombre,
        precio=producto.precio,
        descripcion=producto.descripcion,
        recetas=recetas_creadas
    )

@router.delete("/{id}", response_model=Message)
def delete_producto(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """
    Delete a product.
    """
    producto = session.get(Producto, id)
    if not producto:
        return Message(message="Product not found")
    session.delete(producto)
    session.commit()
    return Message(message="Product deleted successfully")