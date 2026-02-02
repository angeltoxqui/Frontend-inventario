"""Script para verificar credenciales del restaurante"""
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
from app.core.encryption import decrypt_credential


async def check_credentials():
    async with AsyncSession(engine) as session:
        result = await session.execute(
            select(Restaurant).where(Restaurant.id == 1)
        )
        restaurant = result.scalar_one_or_none()
        
        if not restaurant:
            print("Restaurant with ID 1 not found!")
            return
        
        print(f"\n=== Restaurant: {restaurant.name} ===")
        print(f"NIT: {restaurant.nit}")
        print(f"client_id: {restaurant.factus_client_id}")
        print(f"email: {restaurant.factus_email}")
        print(f"\n--- Encrypted values ---")
        print(f"client_secret (encrypted): {restaurant.factus_client_secret[:50]}...")
        print(f"password (encrypted): {restaurant.factus_password[:50]}...")
        
        print(f"\n--- Decrypted values ---")
        try:
            decrypted_secret = decrypt_credential(restaurant.factus_client_secret)
            print(f"client_secret (decrypted): {decrypted_secret}")
        except Exception as e:
            print(f"ERROR decrypting client_secret: {e}")
        
        try:
            decrypted_password = decrypt_credential(restaurant.factus_password)
            print(f"password (decrypted): {decrypted_password}")
        except Exception as e:
            print(f"ERROR decrypting password: {e}")


if __name__ == "__main__":
    asyncio.run(check_credentials())
