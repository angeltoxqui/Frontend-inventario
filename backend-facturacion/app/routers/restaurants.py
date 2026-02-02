"""
Router de FastAPI para gestión de restaurantes (tenants).
Endpoints de onboarding y administración.
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.schemas.restaurants import (
    RestaurantCreate,
    RestaurantUpdate,
    RestaurantResponse,
    RestaurantListResponse,
    RestaurantCredentialsStatus,
)
from app.services.restaurants import RestaurantService, get_restaurant_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/restaurants", tags=["Restaurantes"])


# =============================================================================
# DEPENDENCY HELPERS
# =============================================================================

async def get_service(
    session: AsyncSession = Depends(get_session)
) -> RestaurantService:
    """Obtiene el servicio de restaurantes."""
    return await get_restaurant_service(session)


# =============================================================================
# ENDPOINTS DE ONBOARDING
# =============================================================================

@router.post(
    "",
    response_model=RestaurantResponse,
    status_code=201,
    summary="Registrar nuevo restaurante"
)
async def create_restaurant(
    data: RestaurantCreate,
    service: RestaurantService = Depends(get_service)
):
    """
    Registra un nuevo restaurante en el sistema.
    
    Las credenciales de Factus (client_secret y password) serán
    **encriptadas automáticamente** antes de guardarse en la BD.
    
    **Importante**: El NIT debe ser único en el sistema.
    """
    try:
        restaurant = await service.create(data)
        return service.to_response(restaurant)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creando restaurante: {e}")
        raise HTTPException(status_code=500, detail="Error interno al crear restaurante")


# =============================================================================
# ENDPOINTS DE CONSULTA
# =============================================================================

@router.get(
    "",
    response_model=RestaurantListResponse,
    summary="Listar restaurantes"
)
async def list_restaurants(
    active_only: bool = Query(True, description="Solo restaurantes activos"),
    service: RestaurantService = Depends(get_service)
):
    """
    Lista todos los restaurantes registrados.
    
    Las credenciales de Factus NO se exponen en esta respuesta,
    solo se indica si están configuradas.
    """
    restaurants = await service.get_all(active_only)
    return RestaurantListResponse(
        total=len(restaurants),
        restaurants=[service.to_response(r) for r in restaurants]
    )


@router.get(
    "/{restaurant_id}",
    response_model=RestaurantResponse,
    summary="Obtener restaurante por ID"
)
async def get_restaurant(
    restaurant_id: int,
    service: RestaurantService = Depends(get_service)
):
    """
    Obtiene los detalles de un restaurante específico.
    
    Las credenciales NO se exponen, solo se indica si están configuradas.
    """
    restaurant = await service.get_by_id(restaurant_id)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurante no encontrado")
    
    return service.to_response(restaurant)


# =============================================================================
# ENDPOINTS DE ADMINISTRACIÓN
# =============================================================================

@router.put(
    "/{restaurant_id}",
    response_model=RestaurantResponse,
    summary="Actualizar restaurante"
)
async def update_restaurant(
    restaurant_id: int,
    data: RestaurantUpdate,
    service: RestaurantService = Depends(get_service)
):
    """
    Actualiza los datos de un restaurante.
    
    Si se actualizan credenciales de Factus, serán encriptadas automáticamente.
    """
    restaurant = await service.update(restaurant_id, data)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurante no encontrado")
    
    return service.to_response(restaurant)


@router.delete(
    "/{restaurant_id}",
    summary="Desactivar restaurante"
)
async def delete_restaurant(
    restaurant_id: int,
    service: RestaurantService = Depends(get_service)
):
    """
    Desactiva un restaurante (soft delete).
    
    El restaurante no se elimina físicamente, solo se marca como inactivo.
    """
    success = await service.delete(restaurant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Restaurante no encontrado")
    
    return {"message": "Restaurante desactivado", "restaurant_id": restaurant_id}


# =============================================================================
# ENDPOINTS DE CREDENCIALES
# =============================================================================

@router.get(
    "/{restaurant_id}/credentials/status",
    response_model=RestaurantCredentialsStatus,
    summary="Verificar estado de credenciales"
)
async def check_credentials_status(
    restaurant_id: int,
    service: RestaurantService = Depends(get_service)
):
    """
    Verifica si el restaurante tiene credenciales de Factus configuradas
    y si son válidas para autenticación.
    
    **Nota**: Este endpoint NO expone las credenciales,
    solo indica su estado.
    """
    restaurant = await service.get_by_id(restaurant_id)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurante no encontrado")
    
    credentials = await service.get_decrypted_credentials(restaurant_id)
    
    has_credentials = credentials is not None
    
    return RestaurantCredentialsStatus(
        restaurant_id=restaurant_id,
        has_credentials=has_credentials,
        can_authenticate=has_credentials,  # Podría verificar con Factus aquí
        message="Credenciales configuradas" if has_credentials else "Sin credenciales"
    )
