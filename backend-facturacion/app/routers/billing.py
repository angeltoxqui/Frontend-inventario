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
from app.core.security import get_current_tenant
from app.db.database import get_session
from app.db.models import Invoice, BillingResolution, Tenant
from app.schemas.factus import (
    InvoiceCreateSchema,
    InvoiceResponseSchema,
    NumberingRangeSchema,
    MunicipalitySchema,
    InvoiceResponseSchema,
    NumberingRangeSchema,
    MunicipalitySchema,
    TributeSchema,
    TributeSchema,
    CreditNoteCreate,
    RestaurantOrderItemSchema, # Add missing import if needed, or check if it was defined in file. Wait, line 59 uses it but I missed it in step 16 view? Ah line 45 uses it. I better check if it's imported.
    # Looking at original file, line 59 uses RestaurantOrderItemSchema but line 45 definition of RestaurantOrderRequest references it.
    # It must be imported from app.schemas.factus?
    # In Step 16, line 23 imports specific items. RestaurantOrderItemSchema is NOT imported in line 23-33 list. 
    # But line 59 uses it. 
    # Ah, I see "from app.schemas.factus import".
    # I will be safe and just keep imports as is but change the service import.
)
from app.services.factus.factory import FactusServiceFactory
from app.services.factus.service import FactusService

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
    current_tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_session)
):
    """
    Verifica que el servicio de facturación esté funcionando para el tenant autenticado.
    """
    try:
        factory = FactusServiceFactory(db)
        # Usamos el context manager para asegurar cierre del cliente HTTP
        async with await factory.create_service_for_tenant(current_tenant.id) as service:
            # Intentar obtener información básica
            await service.get_payment_methods()
            
        return HealthCheckResponse(
            status="ok",
            message=f"Conexión exitosa con Factus para tenant {current_tenant.name} ({current_tenant.id})",
            authenticated=True
        )
    except HTTPException as e:
        return HealthCheckResponse(
            status="error",
            message=e.detail,
            authenticated=True
        )
    except Exception as e:
        return HealthCheckResponse(
            status="error",
            message=f"Error: {str(e)}",
            authenticated=True
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
    current_tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_session)
):
    """
    Retorna los rangos de numeración autorizados por la DIAN para el tenant.
    """
    try:
        factory = FactusServiceFactory(db)
        async with await factory.create_service_for_tenant(current_tenant.id) as service:
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
    current_tenant: Tenant = Depends(get_current_tenant),
    search: Optional[str] = Query(None, description="Término de búsqueda"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_session)
):
    """
    Retorna el catálogo de municipios colombianos.
    """
    try:
        factory = FactusServiceFactory(db)
        async with await factory.create_service_for_tenant(current_tenant.id) as service:
            return await service.get_municipalities(search, page, per_page)
    except FactusAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.get(
    "/tributes",
    response_model=List[TributeSchema],
    summary="Obtener catálogo de tributos"
)
async def get_tributes(
    current_tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_session)
):
    """
    Retorna el catálogo de tributos (impuestos) disponibles.
    """
    try:
        factory = FactusServiceFactory(db)
        async with await factory.create_service_for_tenant(current_tenant.id) as service:
            return await service.get_tributes()
    except FactusAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.get(
    "/payment-methods",
    summary="Obtener métodos de pago disponibles"
)
async def get_payment_methods(
    current_tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_session)
):
    """
    Retorna los métodos de pago disponibles según DIAN.
    """
    try:
        factory = FactusServiceFactory(db)
        async with await factory.create_service_for_tenant(current_tenant.id) as service:
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
    current_tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_session)
):
    """
    Crea una factura electrónica completa.
    Verifica que el rango de numeración pertenezca al tenant autenticado.
    """
    try:
        # 1. Obtener Resolución desde el ID
        stmt = select(BillingResolution).where(BillingResolution.factus_id == invoice_data.numbering_range_id)
        result = await db.exec(stmt)
        resolution = result.first()
        
        if not resolution:
            raise HTTPException(status_code=400, detail="Rango de numeración no encontrado en sistema local")
            
        # 2. Validar que la resolución pertenezca al tenant autenticado
        if resolution.tenant_id != current_tenant.id:
            logger.warning(f"Tenant {current_tenant.id} intentó usar resolución de otro tenant ({resolution.tenant_id})")
            raise HTTPException(status_code=403, detail="El rango de numeración no pertenece a este comercio")
        
        # 3. Instanciar servicio para ese tenant
        factory = FactusServiceFactory(db)
        async with await factory.create_service_for_tenant(current_tenant.id) as service:
            
            # 4. Crear en Factus
            response = await service.create_invoice(invoice_data)
            
            # 5. Guardar en Base de Datos
            new_invoice = Invoice(
                number=response.number,
                cufe=response.cufe,
                factus_id=response.id,
                order_reference=invoice_data.reference_code,
                status=response.status.upper(), # CREATED
                pdf_url=response.pdf_url,
                xml_url=response.xml_url,
                tenant_id=current_tenant.id,
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
    current_tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_session)
):
    """
    Endpoint simplificado para facturar una orden de restaurante.
    """
    try:
        # 1. Validar tenant desde numbering_range_id
        stmt = select(BillingResolution).where(BillingResolution.factus_id == order.numbering_range_id)
        result = await db.exec(stmt)
        resolution = result.first()
        
        if not resolution:
            raise HTTPException(status_code=400, detail="Rango de numeración no válido")
            
        # Validar propiedad
        if resolution.tenant_id != current_tenant.id:
            raise HTTPException(status_code=403, detail="El rango de numeración no pertenece a este comercio")

        # 2. Crear servicio
        factory = FactusServiceFactory(db)
        async with await factory.create_service_for_tenant(current_tenant.id) as service:
            
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
            
            # 3. Crear en Factus
            response = await service.create_invoice(invoice_data)
            
            # 4. Guardar en Base de Datos
            new_invoice = Invoice(
                number=response.number,
                cufe=response.cufe,
                factus_id=response.id,
                order_reference=invoice_data.reference_code,
                status=response.status.upper(),
                pdf_url=response.pdf_url,
                xml_url=response.xml_url,
                tenant_id=current_tenant.id,
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
    current_tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_session)
):
    """
    Realiza la validación final de la factura ante la DIAN/Factus.
    """
    try:
        # 1. Buscar factura para obtener tenant (y asegurar que pertenece al usuario)
        stmt = select(Invoice).where(
            Invoice.number == invoice_number,
            Invoice.tenant_id == current_tenant.id
        )
        exec_result = await db.exec(stmt)
        invoice = exec_result.first()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Factura no encontrada")

        # 2. Crear servicio
        factory = FactusServiceFactory(db)
        async with await factory.create_service_for_tenant(current_tenant.id) as service:
            
            # 3. Llamar servicio de validación
            result = await service.validate_invoice(invoice_number)
            
            # 4. Actualizar estado en BD
            invoice.status = "VALIDATED"
            invoice.validated_at = datetime.utcnow()
            
            # Parsear respuesta para extraer datos clave
            data = result.get("data", {}).get("bill", {}) if isinstance(result, dict) else {}
            
            if data.get("cufe"):
                invoice.cufe = data.get("cufe")
            if data.get("qr"):
                invoice.qr_url = data.get("qr")
            
            xml = data.get("xml_url") or result.get("xml_url")
            if xml:
                invoice.xml_url = xml
                
            pdf = data.get("public_url") or result.get("pdf_url")
            if pdf:
                invoice.pdf_url = pdf
                
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
        # Registrar error en la factura si existe (ya cargada)
        if 'invoice' in locals() and invoice:
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
    current_tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_session)
):
    """
    Crea una Nota Crédito para anular una factura existente.
    """
    try:
        # 1. Buscar factura original en BD local (filtrada por tenant)
        stmt = select(Invoice).where(
            Invoice.number == data.invoice_number,
            Invoice.tenant_id == current_tenant.id
        )
        result = await db.exec(stmt)
        invoice = result.first()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Factura original no encontrada en el sistema")
            
        if invoice.status != "VALIDATED":
             raise HTTPException(
                 status_code=400, 
                 detail=f"La factura está en estado {invoice.status}, solo se pueden anular facturas VALIDATED"
             )
             
        # 2. Buscar Rango de Numeración para Notas Crédito
        stmt_res = select(BillingResolution).where(
            BillingResolution.tenant_id == current_tenant.id,
            BillingResolution.is_active == True,
            BillingResolution.prefix.like("NC%")
        )
        result_res = await db.exec(stmt_res)
        resolution = result_res.first()
        
        if not resolution:
             raise HTTPException(
                 status_code=400, 
                 detail="No se encontró un rango de numeración activo para Notas Crédito (Prefijo 'NC')"
             )

        # 3. Crear servicio y procesar
        factory = FactusServiceFactory(db)
        async with await factory.create_service_for_tenant(current_tenant.id) as service:
            
            # Obtener detalles completos de la factura desde Factus
            original_invoice_data = await service.get_invoice(data.invoice_number)
            
            # Crear Nota Crédito
            response = await service.create_credit_note(
                data=data,
                numbering_range_id=resolution.factus_id,
                original_invoice=original_invoice_data
            )
            
            # Actualizar estado de factura original
            invoice.status = "ANNULLED"
            db.add(invoice)
            
            # Guardar Nota Crédito
            new_nc = Invoice(
                number=response.number,
                cufe=response.cufe,
                factus_id=response.id,
                order_reference=invoice.order_reference,
                status="CREATED",
                document_type="CREDIT_NOTE",
                related_invoice_id=invoice.id,
                tenant_id=current_tenant.id,
                pdf_url=response.pdf_url,
                xml_url=response.xml_url,
                qr_url=response.qr_code,
                api_response=str(response.model_dump())
            )
            
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
    current_tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_session)
):
    """
    Consulta los detalles de una factura por su número.
    """
    try:
        # Buscar localmente para verificar ownership
        stmt = select(Invoice).where(
            Invoice.number == invoice_number,
            Invoice.tenant_id == current_tenant.id
        )
        result = await db.exec(stmt)
        invoice = result.first()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Factura no encontrada")

        factory = FactusServiceFactory(db)
        async with await factory.create_service_for_tenant(current_tenant.id) as service:
            return await service.get_invoice(invoice_number)
            
    except FactusAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.get(
    "/invoices/{invoice_number}/pdf",
    summary="Obtener URL del PDF"
)
async def get_invoice_pdf(
    invoice_number: str,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_session)
):
    """
    Obtiene la URL para descargar el PDF de la factura.
    """
    try:
        stmt = select(Invoice).where(
            Invoice.number == invoice_number,
            Invoice.tenant_id == current_tenant.id
        )
        result = await db.exec(stmt)
        invoice = result.first()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Factura no encontrada")

        factory = FactusServiceFactory(db)
        async with await factory.create_service_for_tenant(current_tenant.id) as service:
            pdf_url = await service.download_invoice_pdf(invoice_number)
            if not pdf_url:
                raise HTTPException(status_code=404, detail="PDF no disponible")
            return {"pdf_url": pdf_url}
            
    except FactusAPIError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


# =============================================================================
# IMPRESIÓN / TICKETS
# =============================================================================

@router.get(
    "/invoices/{invoice_number}/ticket-data",
    summary="Obtener datos para impresión de tirilla"
)
@router.get(
    "/invoices/{invoice_number}/ticket-data",
    summary="Obtener datos para impresión de tirilla"
)
async def get_invoice_ticket_data(
    invoice_number: str,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_session)
):
    """
    Retorna un JSON optimizado para imprimir en tirilla térmica (80mm).
    Incluye datos del restaurante, resolución, ítems simplificados y desglose de impuestos.
    """
    # 1. Obtener Factura + Tenant (Restaurant -> Tenant)
    stmt = (
        select(Invoice, Tenant)
        .join(Tenant, Invoice.tenant_id == Tenant.id)
        .where(
            Invoice.number == invoice_number,
            Invoice.tenant_id == current_tenant.id
        )
    )
    result = await db.exec(stmt)
    record = result.first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
        
    invoice, tenant = record
    
    # 2. Obtener Resolución (asociada a la factura o activa del tenant)
    # Intentamos buscar la resolución por el prefijo de la factura
    prefix = ""
    # Si la factura tiene prefijo (ej: SETT-123), extraerlo
    if "-" in invoice.number:
        prefix = invoice.number.split("-")[0]
        
    stmt_res = select(BillingResolution).where(
        BillingResolution.tenant_id == tenant.id,
        BillingResolution.prefix == prefix,
        BillingResolution.is_active == True # Preferir la activa
    )
    result_res = await db.exec(stmt_res)
    resolution = result_res.first()
    
    # Si no se encuentra exacta (ej: histórica), buscar cualquiera que coincida con prefijo
    if not resolution and prefix:
         stmt_res_hist = select(BillingResolution).where(
            BillingResolution.tenant_id == tenant.id,
            BillingResolution.prefix == prefix
         ).order_by(BillingResolution.created_at.desc())
         result_res_hist = await db.exec(stmt_res_hist)
         resolution = result_res_hist.first()

    # 3. Procesar respuesta de API guardada para extraer items e impuestos
    # Esto evita tener que consultar a Factus de nuevo
    import json
    api_data = {}
    if invoice.api_response:
        try:
            # Limpiar posible formato raro si se guardó como string de un dict stringificado
            clean_resp = invoice.api_response.replace("'", "\"").replace("None", "null")
            try:
                raw_data = json.loads(invoice.api_response)
            except:
                # Fallback simple
                raw_data = json.loads(clean_resp)
                
            # Factus estructura: data -> bill -> items
            if isinstance(raw_data, dict):
                if "data" in raw_data:
                    api_data = raw_data["data"].get("bill", raw_data.get("data", {}))
                elif "bill" in raw_data: # Directamente bill
                    api_data = raw_data["bill"]
                else:
                    api_data = raw_data
        except Exception as e:
             logger.warning(f"No se pudo parsear api_response de factura {invoice_number}: {e}")

    # Extraer items simplificados
    items = []
    total_iva = 0
    total_ico = 0
    subtotal = 0
    total = 0
    
    raw_items = api_data.get("items", [])
    
    for item in raw_items:
        # Calcular totales
        price_val = item.get("price", 0)
        qty_val = item.get("quantity", 0)
        
        try:
            price = float(price_val)
            qty = float(qty_val)
        except:
            price = 0.0
            qty = 0.0
            
        line_total = price * qty
        subtotal += line_total
        
        # Procesar impuestos del item
        taxes = item.get("taxes", [])
        for tax in taxes:
             try:
                 amount = float(tax.get("tax_amount", 0))
             except:
                 amount = 0.0
                 
             tax_name = tax.get("name", "")
             tax_id = tax.get("tax_id")
             
             # Sumarizadores simples
             if "IVA" in str(tax_name).upper() or tax_id == 1:
                 total_iva += amount
             elif "CONS" in str(tax_name).upper() or "ICO" in str(tax_name).upper() or tax_id == 22:
                 total_ico += amount
        
        items.append({
            "name": item.get("product", {}).get("name") if isinstance(item.get("product"), dict) else item.get("name", "Item"),
            "qty": qty,
            "price": price,
            "total": line_total
        })
        
    # Totales finales (usar los de la factura si están disponibles para precisión)
    # Si api_data tiene totales, usarlos
    if "payment" in api_data and isinstance(api_data.get("payment"), dict): 
         try:
            total = float(api_data.get("payment", {}).get("payable_amount", 0) or 0)
         except:
            total = subtotal + total_iva + total_ico
    else:
         total = subtotal + total_iva + total_ico

    resolution_data = {}
    if resolution:
        resolution_data = {
            "number": resolution.resolution_number,
            "date": str(resolution.resolution_date),
            "prefix": resolution.prefix,
            "from": resolution.from_number,
            "to": resolution.to_number
        }
    
    # Dirección del restaurante (hardcoded por ahora si no está en modelo)
    # Si el modelo Restaurant tuviera address, usarla.
    # Por ahora "Dirección Principal"
    
    qr_code = invoice.qr_url
    if not qr_code and "qr" in api_data:
        qr_code = api_data["qr"]
    
    return {
        "restaurant": {
            "name": tenant.name,
            "nit": tenant.nit,
            "address": "Dirección registrada" 
        },
        "invoice": {
            "number": invoice.number,
            "date": str(invoice.created_at),
            "cufe": invoice.cufe,
            "qr_code": qr_code,
            "payment_form": api_data.get("payment_form", {}).get("name", "Contado") if isinstance(api_data.get("payment_form"), dict) else "Contado"
        },
        "resolution": resolution_data,
        "items": items,
        "totals": {
            "subtotal": subtotal,
            "total_iva": total_iva,
            "total_ico": total_ico,
            "total": total
        },
        "footer_message": "Facturación Electrónica DIAN"
    }
