from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.plemsi import PlemsiService

router = APIRouter(prefix="/api/billing", tags=["Billing"])

# Modelos de validación (Data que viene del React)
class ClientModel(BaseModel):
    nit: str
    name: str
    email: str
    phone: str

class ItemModel(BaseModel):
    id: str
    name: str
    price: float
    quantity: int

class InvoiceRequest(BaseModel):
    orderId: str
    total: float
    paymentMethod: str
    client: ClientModel
    items: List[ItemModel]

@router.post("/emit")
async def emit_invoice(request: InvoiceRequest):
    try:
        # 1. Llamar al servicio de Plemsi
        result = PlemsiService.create_invoice(request.dict())
        
        # 2. Aquí tu compañero debería guardar el CUFE en la base de datos local
        # db.orders.update(id=request.orderId, cufe=result['cufe'])
        
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))