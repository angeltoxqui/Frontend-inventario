"""
Router de FastAPI para facturación electrónica.
Expone los endpoints de Factus al frontend.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    FactusAPIError,
    FactusAuthError,
    FactusInvoiceError,
    FactusValidationError,
)
from app.db.database import get_session
from app.db.models import Invoice, BillingResolution
from app.schemas.factus import (
    InvoiceCreateSchema,
    InvoiceResponseSchema,
    NumberingRangeSchema,
    MunicipalitySchema,
    InvoiceResponseSchema,
    NumberingRangeSchema,
    MunicipalitySchema,
    TributeSchema,
    CreditNoteCreate,
)
from app.services.factus.service import FactusService, get_factus_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/billing", tags=["Facturación"])


# =============================================================================
# MODELOS DE REQUEST/RESPONSE SIMPLIFICADOS
# =============================================================================

class RestaurantOrderRequest(BaseModel):
    """Request simplificado para facturar una orden de restaurante."""
    
    order_id: str
    payment_method: str  # efectivo, tarjeta, transferencia, nequi
    numbering_range_id: int
    
    # Cliente
    customer_nit: str
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    
    # Ítems (formato simplificado)
    items: List[RestaurantOrderItemSchema]
    
    observation: Optional[str] = None


class HealthCheckResponse(BaseModel):
    """Respuesta de health check."""
    status: str
    message: str
    authenticated: bool = False


class ErrorResponse(BaseModel):
    """Respuesta de error estándar."""
    error: str
    message: str
    details: Optional[dict] = None


# =============================================================================
# HEALTH CHECK
# =============================================================================

@router.get(
    "/health",
    response_model=HealthCheckResponse,
    summary="Verificar estado del servicio"
)
async def health_check(
    service: FactusService = Depends(get_factus_service)
):
    """
    Verifica que el servicio de facturación esté funcionando
    y que la autenticación con Factus sea válida.
    """
    try:
        # Intentar obtener rangos de numeración como prueba de conectividad
        await service.get_numbering_ranges()
        return HealthCheckResponse(
            status="ok",
            message="Servicio de facturación operativo",
            authenticated=True
        )
    except FactusAuthError:
        return HealthCheckResponse(
            status="warning",
            message="No se pudo autenticar con Factus, verificar credenciales",
            authenticated=False
        )
    except Exception as e:
        return HealthCheckResponse(
            status="error",
            message=f"Error: {str(e)}",
            authenticated=False
        )


# =============================================================================
# CATÁLOGOS
# =============================================================================

@router.get(
    "/numbering-ranges",
    response_model=List[NumberingRangeSchema],
    summary="Obtener rangos de numeración DIAN"
)
async def get_numbering_ranges(
    service: FactusService = Depends(get_factus_service)
):
    """
    Retorna los rangos de numeración autorizados por la DIAN.
    Estos deben ser cacheados localmente, no consultados en cada venta.
    """
    try:
        return await service.get_numbering_ranges()
    except FactusAuthError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except FactusAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.get(
    "/municipalities",
    response_model=List[MunicipalitySchema],
    summary="Obtener catálogo de municipios"
)
async def get_municipalities(
    search: Optional[str] = Query(None, description="Término de búsqueda"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    service: FactusService = Depends(get_factus_service)
):
    """
    Retorna el catálogo de municipios colombianos.
    Usar para formularios de dirección del cliente.
    """
    try:
        return await service.get_municipalities(search, page, per_page)
    except FactusAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.get(
    "/tributes",
    response_model=List[TributeSchema],
    summary="Obtener catálogo de tributos"
)
async def get_tributes(
    service: FactusService = Depends(get_factus_service)
):
    """
    Retorna el catálogo de tributos (impuestos) disponibles.
    
    Importantes para restaurantes:
    - ID 1: IVA (19%)
    - ID 22: Impoconsumo (8%)
    """
    try:
        return await service.get_tributes()
    except FactusAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.get(
    "/payment-methods",
    summary="Obtener métodos de pago disponibles"
)
async def get_payment_methods(
    service: FactusService = Depends(get_factus_service)
):
    """
    Retorna los métodos de pago disponibles según DIAN.
    
    Comunes:
    - 10: Efectivo
    - 47: Transferencia
    - 48: Tarjeta crédito
    - 49: Tarjeta débito
    """
    try:
        return await service.get_payment_methods()
    except FactusAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


# =============================================================================
# FACTURACIÓN
# =============================================================================

@router.post(
    "/invoices",
    response_model=InvoiceResponseSchema,
    summary="Crear factura electrónica"
)
async def create_invoice(
    invoice_data: InvoiceCreateSchema,
    service: FactusService = Depends(get_factus_service),
    db: AsyncSession = Depends(get_session)
):
    """
    Crea una factura electrónica completa.
    Usar cuando se tenga control total sobre el formato de datos.
    """
    try:
        # 1. Crear en Factus
        response = await service.create_invoice(invoice_data)
        
        # 2. Obtener Restaurant ID desde el Rango de Numeración
        stmt = select(BillingResolution).where(BillingResolution.factus_id == invoice_data.numbering_range_id)
        result = await db.exec(stmt)
        resolution = result.first()
        restaurant_id = resolution.restaurant_id if resolution else 1 # Fallback ID 1 si no se encuentra
        
        # 3. Guardar en Base de Datos
        new_invoice = Invoice(
            number=response.number,
            cufe=response.cufe,
            factus_id=response.id,
            order_reference=invoice_data.reference_code,
            status=response.status.upper(), # CREATED
            pdf_url=response.pdf_url,
            xml_url=response.xml_url,
            restaurant_id=restaurant_id,
            api_response=str(response.model_dump())
        )
        db.add(new_invoice)
        await db.commit()
        await db.refresh(new_invoice)
        
        return response
        
    except FactusValidationError as e:
        raise HTTPException(status_code=422, detail={
            "error": "validation_error",
            "message": str(e),
            "details": e.details
        })
    except FactusInvoiceError as e:
        raise HTTPException(status_code=400, detail={
            "error": "invoice_error",
            "message": str(e),
            "details": e.details
        })
    except FactusAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.post(
    "/invoices/from-order",
    response_model=InvoiceResponseSchema,
    summary="Facturar orden de restaurante"
)
async def create_invoice_from_order(
    order: RestaurantOrderRequest,
    service: FactusService = Depends(get_factus_service),
    db: AsyncSession = Depends(get_session)
):
    """
    Endpoint simplificado para facturar una orden de restaurante.
    Realiza el mapeo automático al formato de Factus.
    
    Ejemplo de items:
    ```
    [
        {"id": "PROD001", "name": "Hamburguesa", "price": 25000, "quantity": 2},
        {"id": "PROD002", "name": "Coca-Cola", "price": 5000, "quantity": 2, "is_taxed": false},
        {"id": "PROD003", "name": "Cerveza", "price": 8000, "quantity": 1, "tax_type": "ICO"}
    ]
    ```
    """
    try:
        # Convertir items a dicts para el servicio (que usa .get())
        items_dicts = [item.model_dump() for item in order.items]

        # Mapear orden al formato de factura
        invoice_data = service.map_restaurant_order_to_invoice(
            order_id=order.order_id,
            customer_nit=order.customer_nit,
            customer_name=order.customer_name,
            customer_email=order.customer_email,
            items=items_dicts,
            payment_method=order.payment_method,
            numbering_range_id=order.numbering_range_id,
            observation=order.observation
        )
        
        # 1. Crear en Factus
        response = await service.create_invoice(invoice_data)
        
        # 2. Obtener Restaurant ID desde el Rango de Numeración
        stmt = select(BillingResolution).where(BillingResolution.factus_id == invoice_data.numbering_range_id)
        result = await db.exec(stmt)
        resolution = result.first()
        restaurant_id = resolution.restaurant_id if resolution else 1
        
        # 3. Guardar en Base de Datos
        new_invoice = Invoice(
            number=response.number,
            cufe=response.cufe,
            factus_id=response.id,
            order_reference=invoice_data.reference_code,
            status=response.status.upper(),
            pdf_url=response.pdf_url,
            xml_url=response.xml_url,
            restaurant_id=restaurant_id,
            api_response=str(response.model_dump())
        )
        db.add(new_invoice)
        await db.commit()
        await db.refresh(new_invoice)

        return response
        
    except FactusValidationError as e:
        raise HTTPException(status_code=422, detail={
            "error": "validation_error",
            "message": str(e),
            "details": e.details
        })
    except FactusInvoiceError as e:
        raise HTTPException(status_code=400, detail={
            "error": "invoice_error", 
            "message": str(e),
            "details": e.details
        })
    except FactusAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.post(
    "/invoices/{invoice_number}/validate",
    summary="Validar factura ante DIAN"
)
async def validate_invoice(
    invoice_number: str,
    service: FactusService = Depends(get_factus_service),
    db: AsyncSession = Depends(get_session)
):
    """
    Realiza la validación final de la factura ante la DIAN/Factus.
    Actualiza el estado de la factura en la base de datos local.
    """
    try:
        # 1. Llamar servicio de validación
        result = await service.validate_invoice(invoice_number)
        
        # 2. Actualizar estado en BD
        stmt = select(Invoice).where(Invoice.number == invoice_number)
        exec_result = await db.exec(stmt)
        invoice = exec_result.first()
        
        if invoice:
            invoice.status = "VALIDATED"
            invoice.validated_at = datetime.utcnow()
            
            # Parsear respuesta para extraer datos clave
            data = result.get("data", {}).get("bill", {}) if isinstance(result, dict) else {}
            
            # Extraer CUFE
            cufe = data.get("cufe")
            if cufe:
                invoice.cufe = cufe
                
            # Extraer QR
            qr = data.get("qr")
            if qr:
                invoice.qr_url = qr
            
            # Extraer XML URL (intentar en varios lugares)
            xml = data.get("xml_url") or result.get("xml_url")
            if xml:
                invoice.xml_url = xml
                
            # Extraer PDF URL (intentar en varios lugares)
            # Factus a veces devuelve public_url como PDF
            pdf = data.get("public_url") or result.get("pdf_url")
            if pdf:
                invoice.pdf_url = pdf
                
            # Actualizar respuesta raw
            invoice.api_response = str(result)
            
            db.add(invoice)
            await db.commit()
            await db.refresh(invoice)
            
        return {
            "status": "success", 
            "message": "Factura validada correctamente ante la DIAN", 
            "data": {
                "cufe": invoice.cufe,
                "qr_code": invoice.qr_url,
                "status": invoice.status,
                "pdf_url": invoice.pdf_url
            }
        }
        
    except FactusAPIError as e:
        # Registrar error en la factura si existe
        stmt = select(Invoice).where(Invoice.number == invoice_number)
        exec_result = await db.exec(stmt)
        invoice = exec_result.first()
        if invoice:
            invoice.status = "ERROR_VALIDATING"
            invoice.api_response = str(e)
            db.add(invoice)
            await db.commit()
            
        raise HTTPException(
            status_code=e.status_code or 500, 
            detail={
                "error": "validation_error",
                "message": e.message,
                "details": getattr(e, "details", None)
            }
        )


@router.post(
    "/credit-notes",
    response_model=InvoiceResponseSchema,
    summary="Crear Nota Crédito (Anular Factura)"
)
async def create_credit_note(
    data: CreditNoteCreate,
    service: FactusService = Depends(get_factus_service),
    db: AsyncSession = Depends(get_session)
):
    """
    Crea una Nota Crédito para anular una factura existente.
    Requiere que la factura original esté en estado VALIDATED.
    """
    try:
        # 1. Buscar factura original en BD local
        stmt = select(Invoice).where(Invoice.number == data.invoice_number)
        result = await db.exec(stmt)
        invoice = result.first()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Factura original no encontrada en el sistema")
            
        if invoice.status != "VALIDATED":
             raise HTTPException(
                 status_code=400, 
                 detail=f"La factura está en estado {invoice.status}, solo se pueden anular facturas VALIDATED"
             )
             
        # 2. Buscar Rango de Numeración para Notas Crédito (Prefijo 'NC')
        # Asumimos que el restaurante de la factura original es el mismo
        stmt_res = select(BillingResolution).where(
            BillingResolution.restaurant_id == invoice.restaurant_id,
            BillingResolution.is_active == True,
            BillingResolution.prefix.like("NC%") # Convención: Prefijo empieza con NC
        )
        result_res = await db.exec(stmt_res)
        resolution = result_res.first()
        
        if not resolution:
             raise HTTPException(
                 status_code=400, 
                 detail="No se encontró un rango de numeración activo para Notas Crédito (Prefijo 'NC')"
             )

        # 3. Obtener detalles completos de la factura desde Factus (para asegurar datos frescos)
        original_invoice_data = await service.get_invoice(data.invoice_number)
        
        # 4. Crear Nota Crédito en Factus
        response = await service.create_credit_note(
            data=data,
            numbering_range_id=resolution.factus_id,
            original_invoice=original_invoice_data
        )
        
        # 5. Actualizar estado de factura original
        invoice.status = "ANNULLED"
        db.add(invoice)
        
        # 6. Guardar Nota Crédito
        new_nc = Invoice(
            number=response.number,
            cufe=response.cufe,
            factus_id=response.id,
            order_reference=invoice.order_reference, # Misma orden
            status="CREATED", # Nace creada, luego se valida (aunque Factus suele validarla de una si es NC)
            document_type="CREDIT_NOTE",
            related_invoice_id=invoice.id,
            restaurant_id=invoice.restaurant_id,
            pdf_url=response.pdf_url,
            xml_url=response.xml_url,
            qr_url=response.qr_code,
            api_response=str(response.model_dump())
        )
        
        # Si Factus ya devolvió estado VALIDATED (común en V1 validate directo), actualizarlo
        if response.status == "validated":
            new_nc.status = "VALIDATED"
            new_nc.validated_at = datetime.utcnow()
            
        db.add(new_nc)
        await db.commit()
        await db.refresh(new_nc)
        
        return response

    except FactusValidationError as e:
        raise HTTPException(status_code=422, detail={
            "error": "validation_error",
            "message": str(e),
            "details": e.details
        })
    except FactusInvoiceError as e:
        raise HTTPException(status_code=400, detail={
            "error": "invoice_error",
            "message": str(e),
            "details": e.details
        })
    except FactusAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.get(
    "/invoices/{invoice_number}",
    summary="Consultar factura"
)
async def get_invoice(
    invoice_number: str,
    service: FactusService = Depends(get_factus_service)
):
    """
    Consulta los detalles de una factura por su número.
    """
    try:
        return await service.get_invoice(invoice_number)
    except FactusAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.get(
    "/invoices/{invoice_number}/pdf",
    summary="Obtener URL del PDF"
)
async def get_invoice_pdf(
    invoice_number: str,
    service: FactusService = Depends(get_factus_service)
):
    """
    Obtiene la URL para descargar el PDF de la factura.
    """
    try:
        pdf_url = await service.download_invoice_pdf(invoice_number)
        if not pdf_url:
            raise HTTPException(status_code=404, detail="PDF no disponible")
        return {"pdf_url": pdf_url}
    except FactusAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))
