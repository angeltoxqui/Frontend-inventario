"""Script para actualizar credenciales del restaurante con las correctas"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import engine
from app.db.models import Restaurant
from app.core.encryption import encrypt_credential


# Credenciales correctas del Sandbox de Factus (proporcionadas por el usuario)
CORRECT_CREDENTIALS = {
    "factus_client_id": "a0f6b269-dfc8-4d02-a23a-321912f211fe",
    "factus_client_secret": "T3YHlinb3MCJHimz62RIcenl24IL8CiDZysNFC4t",
    "factus_email": "sandbox@factus.com.co",
    "factus_password": "sandbox2024%"
}


async def update_credentials():
    async with AsyncSession(engine) as session:
        result = await session.execute(
            select(Restaurant).where(Restaurant.id == 1)
        )
        restaurant = result.scalar_one_or_none()
        
        if not restaurant:
            print("Restaurant with ID 1 not found!")
            return
        
        print(f"\n=== Actualizando credenciales de: {restaurant.name} ===")
        
        # Encriptar las nuevas credenciales
        encrypted_secret = encrypt_credential(CORRECT_CREDENTIALS["factus_client_secret"])
        encrypted_password = encrypt_credential(CORRECT_CREDENTIALS["factus_password"])
        
        # Actualizar
        restaurant.factus_client_id = CORRECT_CREDENTIALS["factus_client_id"]
        restaurant.factus_client_secret = encrypted_secret
        restaurant.factus_email = CORRECT_CREDENTIALS["factus_email"]
        restaurant.factus_password = encrypted_password
        
        await session.commit()
        
        print("✅ Credenciales actualizadas exitosamente!")
        print(f"   client_id: {CORRECT_CREDENTIALS['factus_client_id']}")
        print(f"   email: {CORRECT_CREDENTIALS['factus_email']}")


if __name__ == "__main__":
    asyncio.run(update_credentials())
