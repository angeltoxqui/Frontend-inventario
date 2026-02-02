"""Script para probar autenticación con credenciales del tenant"""
import asyncio
import httpx
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
from app.core.config import Settings


async def test_tenant_auth():
    # 1. Obtener credenciales del tenant
    async with AsyncSession(engine) as session:
        result = await session.execute(
            select(Restaurant).where(Restaurant.id == 1)
        )
        restaurant = result.scalar_one_or_none()
        
        if not restaurant:
            print("Restaurant ID 1 not found!")
            return
        
        print(f"\n=== Restaurant: {restaurant.name} ===")
        
        # 2. Desencriptar credenciales
        client_id = restaurant.factus_client_id
        client_secret = decrypt_credential(restaurant.factus_client_secret)
        email = restaurant.factus_email
        password = decrypt_credential(restaurant.factus_password)
        
        print(f"client_id: {client_id}")
        print(f"client_secret: {client_secret}")
        print(f"email: {email}")
        print(f"password: {password}")
    
    # 3. Crear settings temporales con credenciales del tenant
    settings = Settings(
        factus_base_url="https://api-sandbox.factus.com.co",
        factus_client_id=client_id,
        factus_client_secret=client_secret,
        factus_email=email,
        factus_password=password,
    )
    
    print(f"\nBase URL: {settings.factus_base_url}")
    
    # 4. Intentar autenticar directamente
    async with httpx.AsyncClient() as client:
        print("\n=== Probando autenticación ===")
        
        auth_url = f"{settings.factus_base_url}/oauth/token"
        auth_data = {
            "grant_type": "password",
            "client_id": settings.factus_client_id,
            "client_secret": settings.factus_client_secret,
            "username": settings.factus_email,
            "password": settings.factus_password,
        }
        
        print(f"POST {auth_url}")
        print(f"Data: {auth_data}")
        
        response = await client.post(auth_url, data=auth_data)
        
        print(f"\nStatus: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        if response.status_code == 200:
            token_data = response.json()
            token = token_data.get("access_token", "")[:50]
            print(f"\n✅ TOKEN OBTENIDO: {token}...")
            
            # 5. Probar endpoint de rangos y validar esquema
            print("\n=== Probando endpoint /v1/numbering-ranges ===")
            ranges_response = await client.get(
                f"{settings.factus_base_url}/v1/numbering-ranges",
                headers={"Authorization": f"Bearer {token_data['access_token']}"}
            )
            print(f"Status: {ranges_response.status_code}")
            if ranges_response.status_code == 200:
                data = ranges_response.json()
                import json
                with open("response_dump.json", "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print("JSON dumped to response_dump.json")
                print(f"Keys: {list(data.keys()) if isinstance(data, dict) else type(data)}")
                
                # Extraer items con lógica robusta (copiado de billing_ranges.py)
                items = []
                outer_data = data.get("data")
                if isinstance(outer_data, dict):
                    items = outer_data.get("data", [])
                elif isinstance(outer_data, list):
                    items = outer_data
                    
                if items and len(items) > 0:
                    print(f"\nItem 0 (raw): {items[0]}")
                    
                    # Intentar validar con esquema
                    from app.schemas.billing_ranges import BillingRangeFactusResponse
                    try:
                        # Probar TODOS los items para asegurar
                        for idx, item in enumerate(items):
                            print(f"Validando item {idx}...")
                            obj = BillingRangeFactusResponse(**item)
                        print("✅ Validación exitosa de TODOS los items!")
                    except Exception as e:
                        print(f"❌ ERROR DE VALIDACIÓN: {e}")
                else:
                    print(f"No data found or empty list. outer_data type: {type(outer_data)}")
        else:
            print(f"\n❌ ERROR DE AUTENTICACIÓN")


if __name__ == "__main__":
    asyncio.run(test_tenant_auth())
