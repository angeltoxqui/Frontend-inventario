import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Insumo, 
    InsumoCreate, 
    InsumoPublic, 
    InsumosPublic, 
    InsumoUpdate, 
    Message, 
    Receta
)

router = APIRouter(prefix="/insumos", tags=["insumos"])

@router.get("/", response_model=InsumosPublic)
def read_insumos(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve insumos (Ordenados alfabéticamente).
    """
    count_statement = select(func.count()).select_from(Insumo)
    count = session.exec(count_statement).one()
    
    # MEJORA: Agregado .order_by(Insumo.nombre) para que salgan en orden
    statement = select(Insumo).order_by(Insumo.nombre).offset(skip).limit(limit)
    insumos = session.exec(statement).all()
    
    return InsumosPublic(data=insumos, count=count)

@router.post("/", response_model=InsumoPublic)
def create_insumo(
    *, session: SessionDep, current_user: CurrentUser, insumo_in: InsumoCreate
) -> Any:
    """
    Create new insumo. Valida duplicados.
    """
    # Validar si ya existe el nombre (normalizado)
    existing_insumo = session.exec(select(Insumo).where(Insumo.nombre == insumo_in.nombre)).first()
    if existing_insumo:
        raise HTTPException(
            status_code=400, 
            detail=f"El insumo '{insumo_in.nombre}' ya existe en el inventario."
        )

    insumo = Insumo.model_validate(insumo_in)
    session.add(insumo)
    session.commit()
    session.refresh(insumo)
    return insumo

@router.put("/{id}", response_model=InsumoPublic)
def update_insumo(
    *, session: SessionDep, current_user: CurrentUser, id: uuid.UUID, insumo_in: InsumoUpdate
) -> Any:
    """
    Update an insumo (Nombre, Costo, Stock).
    """
    db_insumo = session.get(Insumo, id)
    if not db_insumo:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")

    insumo_data = insumo_in.model_dump(exclude_unset=True)
    db_insumo.sqlmodel_update(insumo_data)
    
    session.add(db_insumo)
    session.commit()
    session.refresh(db_insumo)
    return db_insumo

@router.delete("/{id}", response_model=Message)
def delete_insumo(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """
    Delete an insumo.
    """
    insumo = session.get(Insumo, id)
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")
    
    # Validar dependencias (Seguridad)
    uso_en_receta = session.exec(select(Receta).where(Receta.insumo_id == id)).first()
    if uso_en_receta:
        raise HTTPException(
            status_code=400, 
            detail="No puedes borrar este insumo porque se usa en un Plato del menú. Edita el plato primero y quita este ingrediente."
        )

    session.delete(insumo)
    session.commit()
    return Message(message="Insumo eliminado correctamente")