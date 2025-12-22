from sqlmodel import Session, create_engine, select, SQLModel
from app.core.config import settings
# 1. Importamos la función para encriptar contraseñas
from app.core.security import get_password_hash 

# Ajuste para SQLite
connect_args = {"check_same_thread": False}

engine = create_engine(
    str(settings.SQLALCHEMY_DATABASE_URI),
    connect_args=connect_args, 
    pool_pre_ping=True,
)

def init_db(session: Session) -> None:
    # Crear tablas automáticamente
    from app import models 
    SQLModel.metadata.create_all(engine)

    from app.models import User
    
    # Crear el superusuario inicial si no existe
    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    
    if not user:
        user = User(
            email=settings.FIRST_SUPERUSER,
            # 2. CORRECCIÓN CLAVE: Usamos hashed_password y encriptamos el texto
            hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
            is_superuser=True,
            is_active=True,
        )
        session.add(user)
        session.commit()