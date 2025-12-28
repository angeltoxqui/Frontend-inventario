import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.security import get_password_hash
from app.models import (
    Message,
    User,
    UserPublic,
    UserRegister,
    UsersPublic,
)

router = APIRouter(prefix="/users", tags=["users"])

# --- NUEVO ENDPOINT: PERMITE AL FRONTEND SABER QUIÉN ES Y QUÉ ROL TIENE ---
@router.get("/me", response_model=UserPublic)
def read_user_me(current_user: CurrentUser) -> Any:
    return current_user
# --------------------------------------------------------------------------

@router.get("/", response_model=UsersPublic)
def read_users(session: SessionDep, skip: int = 0, limit: int = 100, current_user: CurrentUser = None) -> Any:
    count_statement = select(func.count()).select_from(User)
    count = session.exec(count_statement).one()
    statement = select(User).offset(skip).limit(limit)
    users = session.exec(statement).all()
    return UsersPublic(data=users, count=count)

@router.post("/", response_model=UserPublic)
def create_user(*, session: SessionDep, user_in: UserRegister) -> Any:
    user = session.exec(select(User).where(User.email == user_in.email)).first()
    if user:
        raise HTTPException(status_code=400, detail="El usuario ya existe en el sistema.")
    
    # Por defecto en_turno=True al crear
    user = User.model_validate(user_in, update={"hashed_password": get_password_hash(user_in.password), "is_superuser": False, "en_turno": True})
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.patch("/{user_id}/toggle-turno", response_model=UserPublic)
def toggle_turno(user_id: uuid.UUID, session: SessionDep, current_user: CurrentUser) -> Any:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.en_turno = not user.en_turno
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.delete("/{user_id}", response_model=Message)
def delete_user(session: SessionDep, current_user: CurrentUser, user_id: uuid.UUID) -> Message:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user == current_user:
        raise HTTPException(status_code=400, detail="No puedes borrarte a ti mismo")
    session.delete(user)
    session.commit()
    return Message(message="User deleted successfully")