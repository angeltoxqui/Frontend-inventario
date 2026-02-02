import httpx
import asyncio

async def test_sync():
    async with httpx.AsyncClient() as client:
        try:
            print("=== LISTANDO RANGOS ===")
            response = await client.get("http://127.0.0.1:8000/api/billing/ranges?restaurant_id=1")
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                for item in data:
                    print(f"ID: {item.get('id')} - FactusID: {item.get('factus_id')} - Res: {item.get('resolution_number')} - Prefix: {item.get('prefix')}")
            else:
                print(response.text)
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_sync())
