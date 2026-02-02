"""
Configuración de la base de datos con SQLModel (async).
Usa SQLite para desarrollo, puede cambiarse a PostgreSQL en producción.
"""

from typing import AsyncGenerator
import os

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

# URL de la base de datos (SQLite async para desarrollo)
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "sqlite+aiosqlite:///./billing.db"
)

# Engine async
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # True para debug SQL
    future=True
)

# Session factory async
async_session_maker = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def init_db() -> None:
    """
    Crea todas las tablas definidas en los modelos SQLModel.
    Llamar al inicio de la aplicación.
    """
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency injection para obtener una sesión de BD.
    Usar con FastAPI Depends().
    """
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
