# backend/inicializar_db.py
import logging
from sqlmodel import Session, select

# Importamos la configuración y la conexión
from app.core.db import engine, init_db
from app.core.config import settings
from app.models import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init() -> None:
    with Session(engine) as session:
        # 1. Crear todas las tablas (User, Insumo, Producto, Receta, etc.)
        # Esto buscará todos los modelos importados en app.models y creará la estructura.
        logger.info("Creando tablas en la base de datos...")
        init_db(session)
        
        # 2. Verificar si se creó el superusuario
        user = session.exec(
            select(User).where(User.email == settings.FIRST_SUPERUSER)
        ).first()
        
        if user:
            logger.info(f"¡Éxito! El superusuario {settings.FIRST_SUPERUSER} ya existe (o acaba de ser creado).")
        else:
            logger.error("Algo falló: No se pudo verificar el superusuario.")

if __name__ == "__main__":
    logger.info("Iniciando inicialización de DB...")
    init()
    logger.info("Inicialización terminada.")