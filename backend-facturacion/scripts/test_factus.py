"""Script para probar la respuesta de Factus API"""
import asyncio
import httpx
import json
from dotenv import load_dotenv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

from app.core.config import get_settings
from app.services.factus.auth import FactusAuthManager


async def test_factus_api():
    settings = get_settings()
    
    async with httpx.AsyncClient() as client:
        # Crear auth manager con client y settings
        auth_manager = FactusAuthManager(client, settings)
        
        # Obtener token
        token = await auth_manager.get_valid_token()
        print(f"Token obtenido: {token[:40]}...")
        
        # Llamar a numbering-ranges
        response = await client.get(
            f"{settings.factus_base_url}/v1/numbering-ranges",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"\nStatus: {response.status_code}")
        resp_data = response.json()
        
        print(f"\nTipo de respuesta: {type(resp_data)}")
        if isinstance(resp_data, dict):
            print(f"Keys: {list(resp_data.keys())}")
            
            data_field = resp_data.get("data")
            print(f"\nTipo de 'data': {type(data_field)}")
            
            if isinstance(data_field, list) and len(data_field) > 0:
                print(f"Cantidad de items: {len(data_field)}")
                print(f"Tipo del primer item: {type(data_field[0])}")
                print(f"\nPrimer item completo:")
                print(json.dumps(data_field[0], indent=2, default=str))
            elif isinstance(data_field, str):
                print(f"'data' es STRING: '{data_field[:200]}'...")
            else:
                print(f"'data' contenido: {data_field}")


if __name__ == "__main__":
    asyncio.run(test_factus_api())
