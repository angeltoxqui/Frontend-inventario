"""
Servicio de negocio para facturación electrónica con Factus.
Contiene la lógica de alto nivel para crear facturas, consultar catálogos, etc.
"""

import logging
from typing import List, Optional
from decimal import Decimal

import httpx

from app.core.config import Settings, get_settings
from app.core.exceptions import FactusInvoiceError
from app.schemas.factus import (
    InvoiceCreateSchema,
    InvoiceResponseSchema,
    InvoiceItemSchema,
    CustomerSchema,
    TaxSchema,
    NumberingRangeSchema,
    MunicipalitySchema,
    MunicipalitySchema,
    TributeSchema,
    CreditNoteCreate,
)
from app.services.factus.client import FactusClient

logger = logging.getLogger(__name__)


class FactusService:
    """
    Servicio de alto nivel para facturación electrónica.
    
    Proporciona métodos para:
    - Crear y validar facturas electrónicas
    - Consultar catálogos (municipios, tributos, rangos de numeración)
    - Mapear órdenes de restaurante al formato de factura
    """
    
    def __init__(self, client: FactusClient, settings: Settings):
        """
        Inicializa el servicio de Factus.
        
        Args:
            client: Cliente HTTP de Factus configurado
            settings: Configuración de la aplicación
        """
        self._client = client
        self._settings = settings

    async def close(self):
        """Cierra la conexión HTTP subyacente."""
        if hasattr(self._client, "_client"):
            await self._client._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        await self.close()
    
    # =========================================================================
    # CATÁLOGOS
    # =========================================================================
    
    async def get_numbering_ranges(self) -> List[NumberingRangeSchema]:
        """
        Obtiene los rangos de numeración autorizados por la DIAN.
        
        Estos deben ser cacheados o guardados en BD local, 
        no consultados en cada venta.
        
        Returns:
            Lista de rangos de numeración disponibles
        """
        logger.info("Consultando rangos de numeración de Factus")
        response = await self._client.get("/v1/numbering-ranges")
        
        # Manejar diferentes estructuras de respuesta
        data = response.get("data", response) if isinstance(response, dict) else response
        
        if isinstance(data, list):
            return [NumberingRangeSchema(**item) for item in data]
        return []
    
    async def get_municipalities(
        self, 
        search: Optional[str] = None,
        page: int = 1,
        per_page: int = 50
    ) -> List[MunicipalitySchema]:
        """
        Obtiene el catálogo de municipios colombianos.
        
        Args:
            search: Término de búsqueda opcional
            page: Número de página
            per_page: Resultados por página
            
        Returns:
            Lista de municipios
        """
        logger.info("Consultando municipios de Factus")
        params = {"page": page, "per_page": per_page}
        if search:
            params["search"] = search
            
        response = await self._client.get("/v1/municipalities", params=params)
        data = response.get("data", []) if isinstance(response, dict) else response
        
        return [MunicipalitySchema(**item) for item in data]
    
    async def get_tributes(self) -> List[TributeSchema]:
        """
        Obtiene el catálogo de tributos (impuestos) disponibles.
        
        Importantes para restaurantes:
        - ID 1: IVA (19%)
        - ID 22: Impoconsumo (8% típico)
        
        Returns:
            Lista de tributos disponibles
        """
        logger.info("Consultando tributos de Factus")
        response = await self._client.get("/v1/tributes")
        data = response.get("data", []) if isinstance(response, dict) else response
        
        return [TributeSchema(**item) for item in data]
    
    async def get_payment_methods(self) -> List[dict]:
        """
        Obtiene los métodos de pago disponibles.
        
        Códigos comunes:
        - 10: Efectivo
        - 47: Transferencia
        - 48: Tarjeta de crédito
        - 49: Tarjeta débito
        
        Returns:
            Lista de métodos de pago
        """
        logger.info("Consultando métodos de pago de Factus")
        response = await self._client.get("/v1/payment-methods")
        return response.get("data", []) if isinstance(response, dict) else response
    
    # =========================================================================
    # FACTURACIÓN
    # =========================================================================
    
    async def create_invoice(
        self, 
        invoice_data: InvoiceCreateSchema
    ) -> InvoiceResponseSchema:
        """
        Crea una factura electrónica en Factus.
        
        Args:
            invoice_data: Datos de la factura validados
            
        Returns:
            Respuesta con CUFE, número de factura y URLs
            
        Raises:
            FactusInvoiceError: Si hay error al crear la factura
        """
        logger.info(f"Creando factura: {invoice_data.reference_code}")
        
        # Convertir al formato de Factus
        payload = invoice_data.to_factus_payload()
        
        try:
            response = await self._client.post("/v1/bills/validate", data=payload)
            
            # Extraer datos de respuesta
            data = response.get("data", response) if isinstance(response, dict) else response
            
            bill_data = data.get("bill", {})
            
            return InvoiceResponseSchema(
                id=bill_data.get("id"),
                number=bill_data.get("number", ""),
                prefix=data.get("numbering_range", {}).get("prefix"),
                cufe=bill_data.get("cufe", ""),
                status=str(bill_data.get("status", "created")),
                pdf_url=bill_data.get("public_url"), # Factus returns public_url
                xml_url=None, # Factus API v1 validate response might not return xml_url directly in bill?
                qr_code=bill_data.get("qr"),
                created_at=None, # Parse string? 
                validated_at=None 
            )
            
        except Exception as e:
            logger.error(f"Error al crear factura {invoice_data.reference_code}: {e}")
            raise FactusInvoiceError(
                message=f"No se pudo crear la factura: {str(e)}",
                invoice_reference=invoice_data.reference_code,
                details=str(e)
            )
    
    async def get_invoice(self, invoice_number: str) -> dict:
        """
        Consulta una factura por su número.
        
        Args:
            invoice_number: Número de la factura (con prefijo si aplica)
            
        Returns:
            Datos de la factura
        """
        logger.info(f"Consultando factura: {invoice_number}")
        response = await self._client.get(f"/v1/bills/show/{invoice_number}")
        return response.get("data", response) if isinstance(response, dict) else response
    
    async def download_invoice_pdf(self, invoice_number: str) -> Optional[str]:
        """
        Obtiene la URL del PDF de una factura.
        
        Args:
            invoice_number: Número de la factura
            
        Returns:
            URL del PDF o None si no está disponible
        """
        invoice = await self.get_invoice(invoice_number)
        return invoice.get("pdf_url")
    
    async def download_invoice_xml(self, invoice_number: str) -> Optional[str]:
        """
        Obtiene la URL del XML de una factura.
        
        Args:
            invoice_number: Número de la factura
            
        Returns:
            URL del XML o None si no está disponible
        """
        invoice = await self.get_invoice(invoice_number)
        return invoice.get("xml_url")

    async def validate_invoice(self, invoice_number: str) -> dict:
        """
        Valida una factura creada previamente en Factus.
        Este paso es necesario para enviarla a la DIAN.
        
        Args:
            invoice_number: Número de la factura a validar
            
        Returns:
            Respuesta de la validación
        """
        logger.info(f"Validando factura ante DIAN: {invoice_number}")
        # Se asume que el endpoint es /v1/bills/validate/{number} o similar
        # NOTA: Ajustar ruta según documentación real si difiere.
        # Basado en la instrucción del usuario de POST vacío.
        return await self._client.post(f"/v1/bills/validate/{invoice_number}")
    
    async def create_credit_note(
        self,
        data: CreditNoteCreate,
        numbering_range_id: int,
        original_invoice: dict
    ) -> InvoiceResponseSchema:
        """
        Crea una Nota Crédito para anular una factura existente.
        Duplica los ítems de la factura original (Anulación total).
        """
        logger.info(f"Creando Nota Crédito para factura: {data.invoice_number}")
        
        # Extraer datos clave de la factura original
        bill_data = original_invoice if "bill" not in original_invoice else original_invoice.get("bill")
        if not bill_data:
            raise FactusValidationError("No se pudieron leer los datos de la factura original")
            
        # Construir referencia a la factura afectada
        billing_reference = {
            "number": bill_data.get("number"),
            "uuid": bill_data.get("cufe"),
            "issue_date": bill_data.get("created_at", "").split(" ")[0], # Asumiendo formato YYYY-MM-DD HH:MM:SS
            "discrepancy_response_code": data.reason_code,
            "discrepancy_response_description": data.description
        }
        
        # Replicar ítems
        items = original_invoice.get("items", [])
        if not items and "items" in bill_data:
             items = bill_data.get("items")
             
        # Limpiar ítems para el payload de nueva creación
        new_items = []
        for item in items:
             # Mantener estructura básica pero asegurar tipos numéricos
             clean_item = {
                 "code_reference": item.get("code_reference"),
                 "name": item.get("name"),
                 "quantity": float(item.get("quantity")),
                 "price": float(item.get("price")),
                 "discount_rate": float(item.get("discount_rate", 0)),
                 "discount": float(item.get("discount", 0)),
                 "tax_rate": float(item.get("tax_rate", 0)),
                 "unit_measure_id": item.get("unit_measure_id", 70),
                 "standard_code_id": item.get("standard_code_id", 1),
                 "is_excluded": item.get("is_excluded", 0),
                 "tribute_id": item.get("tribute_id", 1),
                 "taxes": item.get("taxes", []),
                 "withholding_taxes": item.get("withholding_taxes", [])
             }
             new_items.append(clean_item)
             
        # Payload de Nota Crédito
        # Factus usa el mismo endpoint /v1/bills/validate pero identifica NC por el rango y billing_reference
        payload = {
            "numbering_range_id": numbering_range_id,
            "reference_code": f"NC-{data.invoice_number}", # Referencia interna única
            "observation": data.description,
            "billing_reference": billing_reference,
            "items": new_items,
            "customer": bill_data.get("customer") or original_invoice.get("customer"), # Reusar cliente
            "payment_form": bill_data.get("payment_form_id", 1),
            "payment_method": bill_data.get("payment_method_id", 10),
        }
        
        try:
            # Enviar a Factus (mismo endpoint de validación/creación)
            response = await self._client.post("/v1/bills/validate", data=payload)
            
            data_resp = response.get("data", response) if isinstance(response, dict) else response
            bill_resp = data_resp.get("bill", {})
            
            return InvoiceResponseSchema(
                id=bill_resp.get("id"),
                number=bill_resp.get("number", ""),
                prefix=data_resp.get("numbering_range", {}).get("prefix"),
                cufe=bill_resp.get("cufe", ""),
                status=str(bill_resp.get("status", "created")),
                pdf_url=bill_resp.get("public_url"),
                xml_url=None,
                qr_code=bill_resp.get("qr"),
                created_at=None,
                validated_at=None
            )
            
        except Exception as e:
             logger.error(f"Error creando Nota Crédito: {e}")
             raise FactusInvoiceError(
                 message=f"No se pudo crear la Nota Crédito: {str(e)}",
                 invoice_reference=data.invoice_number,
                 details=str(e)
             )

    # =========================================================================
    # MAPEO DE ORDEN DE RESTAURANTE
    # =========================================================================
    
    def map_restaurant_order_to_invoice(
        self,
        order_id: str,
        customer_nit: str,
        customer_name: str,
        customer_email: str,
        items: List[dict],
        payment_method: str,
        numbering_range_id: int,
        observation: Optional[str] = None
    ) -> InvoiceCreateSchema:
        """
        Mapea una orden de restaurante interna al formato de factura Factus.
        
        Args:
            order_id: ID de la orden en el sistema
            customer_nit: NIT/Cédula del cliente
            customer_name: Nombre del cliente
            customer_email: Email del cliente
            items: Lista de productos [{id, name, price, quantity, is_taxed}]
            payment_method: Método de pago (efectivo, tarjeta, etc.)
            numbering_range_id: ID del rango de numeración
            observation: Observación adicional
            
        Returns:
            InvoiceCreateSchema listo para enviar a Factus
        """
        # Mapear método de pago a código DIAN
        payment_map = {
            "efectivo": 10,
            "cash": 10,
            "tarjeta": 48,
            "card": 48,
            "transferencia": 47,
            "transfer": 47,
            "nequi": 47,
            "daviplata": 47,
        }
        payment_code = payment_map.get(payment_method.lower(), 10)
        
        # Detectar si es persona jurídica o natural
        is_company = len(customer_nit) >= 9  # NITs empresariales típicamente 9+ dígitos
        
        # Construir cliente
        customer = CustomerSchema(
            identification_document_id=6 if is_company else 3,  # NIT o Cédula
            identification_number=customer_nit,
            entity_type_id=1 if is_company else 2,
            company=customer_name if is_company else None,
            first_name=customer_name.split()[0] if not is_company else None,
            last_name=" ".join(customer_name.split()[1:]) if not is_company and len(customer_name.split()) > 1 else None,
            email=customer_email,
        )
        
        # Construir ítems con impuestos
        invoice_items = []
        for item in items:
            quantity = Decimal(str(item.get("quantity", 1)))
            price = Decimal(str(item.get("price", 0)))
            subtotal = quantity * price
            
            taxes = []
            
            # Lógica de impuestos estricta por ítem (Normativa DIAN)
            tax_type = item.get("tax_type")            
            is_taxed = item.get("is_taxed", True) # Compatibilidad hacia atrás

            if tax_type == "IVA":
                # IVA 19%
                tax_id = 1
                tax_rate = Decimal("19.00")
            elif tax_type == "ICO":
                # Impoconsumo 8%
                tax_id = 22
                tax_rate = Decimal("8.00")
            elif not is_taxed:
                # Excluido / No responsable (IVA 0%)
                tax_id = 1
                tax_rate = Decimal("0.00")
            else:
                 # Default para Restaurantes si no se especifica: Impoconsumo 8%
                 tax_id = 22
                 tax_rate = Decimal("8.00")
                
            if tax_id:
                tax_amount = subtotal * (tax_rate / 100)
                
                taxes.append(TaxSchema(
                    tax_id=tax_id,
                    taxable_amount=subtotal,
                    tax_amount=tax_amount,
                    percent=tax_rate
                ))
            
            invoice_items.append(InvoiceItemSchema(
                code=str(item.get("id", "PROD")),
                description=item.get("name", "Producto"),
                quantity=quantity,
                price=price,
                taxes=taxes
            ))
        
        # Construir factura
        return InvoiceCreateSchema(
            numbering_range_id=numbering_range_id,
            reference_code=order_id,
            payment_form=1,  # Contado
            payment_method=payment_code,
            customer=customer,
            items=invoice_items,
            observation=observation,
        )


# =============================================================================
# FACTORY / DEPENDENCY INJECTION
# =============================================================================

async def get_factus_service() -> FactusService:
    """
    Factory para crear una instancia de FactusService.
    Usar como dependencia en FastAPI.
    
    Yields:
        Instancia configurada de FactusService
    """
    settings = get_settings()
    
    async with httpx.AsyncClient() as http_client:
        client = FactusClient(http_client, settings)
        yield FactusService(client, settings)
