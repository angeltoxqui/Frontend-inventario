import httpx
import asyncio
import json

async def test_invoice():
    payload = {
        "order_id": "TEST-ORDER-001",
        "payment_method": "10", # Efectivo code for Factus? Or internal?
        # BillingService maps string "efectivo" -> 10? 
        # Let's check logic. Assuming 10 (Efectivo) is safe if mapping is not internal.
        # But wait, RestaurantOrderRequest takes "payment_method: str".
        # Service maps it?
        "numbering_range_id": 8,
        "customer_nit": "1010101010",
        "customer_name": "Pepito Perez",
        "customer_email": "pepito@test.com",
        "items": [
            {"id": "ITEM1", "name": "Plato Fuerte", "price": 30000, "quantity": 1, "is_taxed": True}
        ]
    }
    
    # Try sending "efectivo" and let service map it?
    payload["payment_method"] = "10" # sending code directly is safer if mapping assumes codes

    print(f"Enviando factura: {json.dumps(payload, indent=2)}")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "http://127.0.0.1:8000/api/billing/invoices/from-order?restaurant_id=1",
                # Query param restaurant_id is NOT in endpoint definition in billing.py!
                # Wait! depends(get_factus_service) -> usually depends on get_current_restaurant?
                # or checks DB?
                
                # Let's check billing.py dependencies.
                # service: FactusService = Depends(get_factus_service)
                # get_factus_service depends on... ?
                
                # If get_factus_service needs restaurant_id, how does it get it?
                # Maybe header? Or query?
                
                json=payload
            )
            print(f"Status: {response.status_code}")
            try:
                data = response.json()
                with open("invoice_response.json", "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print("Response dumped to invoice_response.json")
            except:
                print(response.text)
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_invoice())
