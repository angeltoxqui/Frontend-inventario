import uuid
from typing import Any
from fastapi import APIRouter, HTTPException
from sqlmodel import func, select
from app.api.deps import SessionDep, CurrentUser
from app.models import Mesa, MesaCreate, MesaPublic, MesasPublic

router = APIRouter(prefix="/mesas", tags=["mesas"])

@router.get("/", response_model=MesasPublic)
def leer_mesas(
    session: SessionDep, skip: int = 0, limit: int = 100
) -> Any:
    """
    Obtener lista de mesas configuradas en el sistema.
    """
    count = session.exec(select(func.count()).select_from(Mesa)).one()
    statement = select(Mesa).where(Mesa.activa == True).offset(skip).limit(limit).order_by(Mesa.nombre)
    mesas = session.exec(statement).all()
    return MesasPublic(data=mesas, count=count)

@router.post("/", response_model=MesaPublic)
def crear_mesa(
    *, session: SessionDep, current_user: CurrentUser, mesa_in: MesaCreate
) -> Any:
    """
    ADMIN: Crear una nueva mesa.
    """
    if current_user.rol != "admin" and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Solo admin puede crear mesas")

    mesa = Mesa.model_validate(mesa_in)
    session.add(mesa)
    session.commit()
    session.refresh(mesa)
    return mesa

@router.delete("/{mesa_id}")
def eliminar_mesa(
    mesa_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    ADMIN: Eliminar mesa.
    """
    if current_user.rol != "admin" and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="No autorizado")
        
    mesa = session.get(Mesa, mesa_id)
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    
    session.delete(mesa)
    session.commit()
    return {"ok": True}