from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import requests
import os
from dotenv import load_dotenv
from datetime import datetime

# Cargar variables de entorno
load_dotenv()

app = FastAPI(title="Módulo de Facturación Electrónica")

# CONFIGURACIÓN CORS (Para que tu React pueda hablar con este Python)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"], # Puertos comunes de Vite/React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELOS DE DATOS (Lo que esperamos recibir de React) ---
class ClientData(BaseModel):
    nit: str
    name: str
    email: str
    phone: str
    address: Optional[str] = "Ciudad Genérica"

class ItemData(BaseModel):
    id: str
    name: str
    price: float
    quantity: int
    is_taxed: bool = False # Por si manejan IVA o no

class InvoiceRequest(BaseModel):
    orderId: str
    paymentMethod: str
    client: ClientData
    items: List[ItemData]
    total: float

# --- LÓGICA DE NEGOCIO ---
@app.post("/api/billing/emit")
async def emit_invoice(data: InvoiceRequest):
    """
    Recibe la venta, formatea el JSON para Plemsi y retorna el CUFE/PDF.
    """
    
    # 1. Mapeo de Método de Pago a código DIAN
    payment_map = {
        "efectivo": 10,
        "tarjeta": 48,
        "transferencia": 47,
        "nequi": 47
    }
    payment_code = payment_map.get(data.paymentMethod.lower(), 10)

    # 2. Construir Payload para Plemsi (Basado en la doc oficial)
    invoice_payload = {
        "resolution_id": int(os.getenv("PLEMSI_RESOLUTION", 0)),
        "prefix": os.getenv("PLEMSI_PREFIX", "SETT"),
        "number": int(datetime.now().timestamp()), # EN PROD: Usar consecutivo real de BD
        "date": datetime.now().strftime("%Y-%m-%d"),
        "time": datetime.now().strftime("%H:%M:%S"),
        "payment_form": {
            "payment_method_id": payment_code,
            "duration_measure": 0,
            "payment_due_date": datetime.now().strftime("%Y-%m-%d")
        },
        "customer": {
            "identification_number": data.client.nit,
            "name": data.client.name,
            "email": data.client.email,
            "phone": data.client.phone,
            "address": data.client.address,
            "merchant_registration": "000000" # Genérico
        },
        "items": []
    }

    # Agregar items
    for item in data.items:
        line_item = {
            "unit_measure_id": 70, # Unidad estándar
            "line_extension_amount": item.price * item.quantity,
            "free_of_charge_indicator": False,
            "quantity": item.quantity,
            "description": item.name,
            "code": item.id,
            "price_amount": item.price,
            "base_quantity": item.quantity,
            "tax_totals": []
        }
        
        # Ejemplo simple de IVA 19% si el producto lo requiere
        if item.is_taxed:
            line_item["tax_totals"].append({
                "tax_id": 1,
                "tax_amount": (item.price * item.quantity) * 0.19,
                "taxable_amount": item.price * item.quantity,
                "percent": 19
            })
            
        invoice_payload["items"].append(line_item)

    # 3. ENVIAR A PLEMSI (O MOCK SI NO HAY TOKEN)
    plemsi_token = os.getenv("PLEMSI_TOKEN")
    
    if not plemsi_token or plemsi_token == "TU_TOKEN_DE_PRUEBAS_AQUI_12345":
        # MODO SIMULACIÓN (Para que puedas entregar funcionando sin pagar API aún)
        import time
        time.sleep(2) # Simular espera de red
        return {
            "status": "success",
            "message": "Factura simulada (Falta Token Real)",
            "data": {
                "cufe": f"cufe-simulado-{data.orderId}",
                "qr_image": "https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg",
                "xml_url": "http://ejemplo.com/factura.xml",
                "number": invoice_payload["number"]
            }
        }

    # MODO REAL (Descomentar cuando tengas Token)
    """
    headers = {
        "Authorization": f"Bearer {plemsi_token}",
        "Content-Type": "application/json"
    }
    try:
        url = f"{os.getenv('PLEMSI_URL')}/invoices"
        res = requests.post(url, json=invoice_payload, headers=headers)
        res.raise_for_status()
        return {"status": "success", "data": res.json()}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="Error comunicando con la DIAN")
    """

# Para correrlo: uvicorn main:app --reload