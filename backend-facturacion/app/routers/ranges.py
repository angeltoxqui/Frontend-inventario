"""
Router de FastAPI para gestión de rangos de numeración DIAN.
Todos los endpoints filtran por tenant_id para seguridad multi-tenant.
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.schemas.billing_ranges import (
    BillingRangeInternal,
    ActiveRangeResponse,
    SyncRangesResponse,
)
from app.services.billing_ranges import BillingRangeService, get_billing_range_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/billing", tags=["Rangos de Numeración"])


# =============================================================================
# DEPENDENCY HELPERS
# =============================================================================

async def get_range_service(
    session: AsyncSession = Depends(get_session)
) -> BillingRangeService:
    """Obtiene el servicio de rangos con sesión inyectada."""
    return await get_billing_range_service(session)


# =============================================================================
# ENDPOINTS DE SINCRONIZACIÓN
# =============================================================================

@router.post(
    "/sync-ranges",
    response_model=SyncRangesResponse,
    summary="Sincronizar rangos desde Factus"
)
async def sync_ranges_from_factus(
    restaurant_id: int = Query(..., description="ID del restaurante/tenant"),
    service: BillingRangeService = Depends(get_range_service)
):
    """
    Sincroniza los rangos de numeración desde Factus.
    
    Útil cuando:
    - El restaurante renueva su resolución ante la DIAN
    - Primera configuración del sistema
    - Verificar estado actual de los rangos
    
    Implementa lógica Upsert:
    - Si el rango existe (por factus_id), lo actualiza
    - Si no existe, lo crea
    """
    try:
        result = await service.sync_ranges_from_factus(restaurant_id)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        
        return result
        
    except Exception as e:
        logger.error(f"Error sincronizando rangos: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# ENDPOINTS DE CONSULTA
# =============================================================================

@router.get(
    "/ranges",
    response_model=List[BillingRangeInternal],
    summary="Listar rangos del restaurante"
)
async def get_ranges(
    restaurant_id: int = Query(..., description="ID del restaurante/tenant"),
    service: BillingRangeService = Depends(get_range_service)
):
    """
    Obtiene todos los rangos de numeración del restaurante.
    
    SEGURIDAD: Siempre filtra por restaurant_id para evitar
    que un restaurante acceda a los rangos de otro.
    """
    try:
        return await service.get_all_ranges(restaurant_id)
    except Exception as e:
        logger.error(f"Error obteniendo rangos: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/ranges/active",
    response_model=ActiveRangeResponse,
    summary="Obtener rango activo para facturar"
)
async def get_active_range(
    restaurant_id: int = Query(..., description="ID del restaurante/tenant"),
    service: BillingRangeService = Depends(get_range_service)
):
    """
    Obtiene el rango activo del restaurante.
    
    CONSULTA ULTRA-RÁPIDA a BD local.
    Esta función es usada por el módulo de facturación
    antes de cada venta para obtener el factus_id.
    """
    result = await service.get_active_range_id(restaurant_id)
    
    if not result:
        raise HTTPException(
            status_code=404,
            detail="No hay un rango activo configurado. Sincronice los rangos y active uno."
        )
    
    if not result.is_valid:
        raise HTTPException(
            status_code=400,
            detail="El rango activo no es válido (puede estar vencido o sin números disponibles)"
        )
    
    return result


# =============================================================================
# ENDPOINTS DE ADMINISTRACIÓN
# =============================================================================

@router.post(
    "/ranges/{range_id}/activate",
    summary="Activar un rango de numeración"
)
async def activate_range(
    range_id: int,
    restaurant_id: int = Query(..., description="ID del restaurante/tenant"),
    service: BillingRangeService = Depends(get_range_service)
):
    """
    Establece un rango como activo.
    
    Solo un rango puede estar activo a la vez por restaurante.
    Al activar uno, los demás se desactivan automáticamente.
    """
    try:
        success = await service.set_active_range(restaurant_id, range_id)
        
        if success:
            return {"message": "Rango activado exitosamente", "range_id": range_id}
        else:
            raise HTTPException(status_code=404, detail="Rango no encontrado")
            
    except Exception as e:
        logger.error(f"Error activando rango: {e}")
        raise HTTPException(status_code=500, detail=str(e))
