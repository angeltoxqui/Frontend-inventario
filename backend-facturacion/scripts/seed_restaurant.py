"""
Script de seed para inicializar el restaurante de prueba con credenciales Sandbox.
Ejecutar: python -m scripts.seed_restaurant
"""

import asyncio
import logging
import sys
import os

# Agregar el directorio raíz al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# IMPORTANTE: Cargar dotenv ANTES de importar módulos de la app
# para que ENCRYPTION_KEY esté disponible
from dotenv import load_dotenv
load_dotenv()

from app.db.database import init_db, async_session_maker
from app.db.models import Restaurant
from app.core.encryption import encrypt_credential
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Datos del restaurante de prueba con credenciales Sandbox
SEED_RESTAURANT = {
    "name": "Restaurante de Prueba - Sandbox",
    "nit": "9001234567",  # NIT ficticio para pruebas
    "factus_client_id": "a0f6b269-dfc8-4d02-a23a-321912f211fe",
    "factus_client_secret": "T3YHlinb3MCJHimz62RIcenl24IL8CiDZysNFC4t",
    "factus_email": "sandbox@factus.com.co",
    "factus_password": "sandbox2024%",
}


async def seed_restaurant():
    """
    Crea el restaurante de prueba en la BD.
    Si ya existe (por NIT), lo actualiza.
    """
    logger.info("Inicializando base de datos...")
    await init_db()
    
    async with async_session_maker() as session:
        # Verificar si ya existe
        result = await session.execute(
            select(Restaurant).where(Restaurant.nit == SEED_RESTAURANT["nit"])
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            logger.info(f"Restaurante ya existe con ID: {existing.id}")
            logger.info("Actualizando credenciales...")
            
            existing.name = SEED_RESTAURANT["name"]
            existing.factus_client_id = SEED_RESTAURANT["factus_client_id"]
            existing.factus_client_secret = encrypt_credential(
                SEED_RESTAURANT["factus_client_secret"]
            )
            existing.factus_email = SEED_RESTAURANT["factus_email"]
            existing.factus_password = encrypt_credential(
                SEED_RESTAURANT["factus_password"]
            )
            existing.is_active = True
            
            await session.commit()
            logger.info(f"✅ Restaurante actualizado: ID={existing.id}")
            print_summary(existing.id)
            return
        
        # Crear nuevo
        logger.info("Creando restaurante de prueba...")
        
        restaurant = Restaurant(
            name=SEED_RESTAURANT["name"],
            nit=SEED_RESTAURANT["nit"],
            factus_client_id=SEED_RESTAURANT["factus_client_id"],
            factus_client_secret=encrypt_credential(
                SEED_RESTAURANT["factus_client_secret"]
            ),
            factus_email=SEED_RESTAURANT["factus_email"],
            factus_password=encrypt_credential(
                SEED_RESTAURANT["factus_password"]
            ),
            is_active=True
        )
        
        session.add(restaurant)
        await session.commit()
        await session.refresh(restaurant)
        
        logger.info(f"✅ Restaurante creado exitosamente")
        print_summary(restaurant.id)


def print_summary(restaurant_id: int):
    """Imprime resumen para el usuario."""
    print("\n" + "="*60)
    print("  RESTAURANTE DE PRUEBA CREADO")
    print("="*60)
    print(f"  ID:     {restaurant_id}")
    print(f"  Nombre: {SEED_RESTAURANT['name']}")
    print(f"  NIT:    {SEED_RESTAURANT['nit']}")
    print("="*60)
    print("\n📋 Próximos pasos:")
    print(f"  1. Sincronizar rangos:")
    print(f"     POST /api/billing/sync-ranges?restaurant_id={restaurant_id}")
    print(f"  2. Listar rangos:")
    print(f"     GET /api/billing/ranges?restaurant_id={restaurant_id}")
    print(f"  3. Activar un rango:")
    print(f"     POST /api/billing/ranges/{{id}}/activate?restaurant_id={restaurant_id}")
    print(f"  4. Facturar:")
    print(f"     POST /api/billing/invoices/from-order")
    print()


if __name__ == "__main__":
    asyncio.run(seed_restaurant())
