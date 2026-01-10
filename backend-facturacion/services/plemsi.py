import os
import requests
from datetime import datetime

# CONFIGURACIÓN (Idealmente usar variables de entorno .env)
PLEMSI_URL = "https://api.plemsi.com/api/v1"  # Verifica la URL base en la documentación de Postman
PLEMSI_TOKEN = os.getenv("PLEMSI_TOKEN", "TU_TOKEN_DE_PRUEBAS_AQUI")

class PlemsiService:
    @staticmethod
    def create_invoice(order_data: dict):
        """
        Recibe la data de tu frontend y la transforma al formato que exige Plemsi.
        """
        
        # 1. Mapeo de datos (Transformación)
        invoice_payload = {
            "resolution_id": "TU_ID_RESOLUCION", # Te lo da Plemsi
            "prefix": "SETT",                    # Prefijo de pruebas
            "number": int(datetime.now().timestamp()), # OJO: Usar un consecutivo real de tu BD
            "date": datetime.now().strftime("%Y-%m-%d"),
            "time": datetime.now().strftime("%H:%M:%S"),
            "payment_form": {
                "payment_method_id": PlemsiService._get_payment_method(order_data['paymentMethod']),
                "duration_measure": 0,
                "payment_due_date": datetime.now().strftime("%Y-%m-%d")
            },
            "customer": {
                "identification_number": order_data['client']['nit'],
                "name": order_data['client']['name'],
                "email": order_data['client']['email'],
                "phone": order_data['client']['phone'],
                "address": "Dirección Genérica", 
                "merchant_registration": "No aplica"
            },
            "items": [
                {
                    "unit_measure_id": 70, # Unidad estándar (Unidad)
                    "line_extension_amount": item['price'] * item['quantity'],
                    "free_of_charge_indicator": False,
                    "quantity": item['quantity'],
                    "description": item['name'],
                    "code": item['id'],
                    "price_amount": item['price'],
                    "base_quantity": item['quantity'],
                    # IMPUESTOS (Ejemplo IVA 19%, ajustar según régimen)
                    "tax_totals": [
                        {
                            "tax_id": 1, # IVA
                            "tax_amount": (item['price'] * item['quantity']) * 0.19,
                            "taxable_amount": item['price'] * item['quantity'],
                            "percent": 19
                        }
                    ]
                } for item in order_data['items']
            ]
        }

        # 2. Envío a la API de Plemsi
        headers = {
            "Authorization": f"Bearer {PLEMSI_TOKEN}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(f"{PLEMSI_URL}/invoices", json=invoice_payload, headers=headers)
            response.raise_for_status() # Lanza error si falla
            return response.json() # Retorna la respuesta (CUFE, QR, XML)
        except requests.exceptions.RequestException as e:
            print(f"Error facturando: {e}")
            if e.response:
                print(e.response.text)
            raise Exception("Error de comunicación con la DIAN/Plemsi")

    @staticmethod
    def _get_payment_method(method: str):
        # Códigos estandar DIAN
        methods = {
            'efectivo': 10,
            'tarjeta': 48,
            'transferencia': 47
        }
        return methods.get(method.lower(), 10)
