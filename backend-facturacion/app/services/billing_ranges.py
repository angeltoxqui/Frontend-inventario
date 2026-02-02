"""
Servicio de gestión de rangos de numeración DIAN.
Implementa sincronización con Factus y consultas multi-tenant.
"""

import logging
from datetime import datetime, date
from typing import List, Optional

import httpx
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.encryption import decrypt_credential
from app.core.exceptions import FactusAPIError, FactusAuthError
from app.db.models import Restaurant, BillingResolution
from app.schemas.billing_ranges import (
    BillingRangeFactusResponse,
    BillingRangeInternal,
    ActiveRangeResponse,
    SyncRangesResponse,
)
from app.services.factus.client import FactusClient
from app.services.factus.auth import FactusAuthManager

logger = logging.getLogger(__name__)


class BillingRangeService:
    """
    Servicio para gestión de rangos de numeración DIAN.
    
    Características:
    - Sincronización desde Factus (Upsert)
    - Consultas multi-tenant seguras
    - Cache local para evitar llamadas a API en cada venta
    """
    
    def __init__(self, session: AsyncSession, settings: Settings):
        """
        Inicializa el servicio.
        
        Args:
            session: Sesión de BD async
            settings: Configuración de la aplicación
        """
        self._session = session
        self._settings = settings
    
    # =========================================================================
    # SINCRONIZACIÓN CON FACTUS
    # =========================================================================
    
    async def sync_ranges_from_factus(
        self, 
        restaurant_id: int
    ) -> SyncRangesResponse:
        """
        Sincroniza los rangos de numeración desde Factus.
        
        Implementa lógica Upsert:
        - Si el rango existe (por factus_id), lo actualiza
        - Si no existe, lo crea
        
        Args:
            restaurant_id: ID del restaurante/tenant
            
        Returns:
            Resultado de la sincronización
            
        Raises:
            FactusAuthError: Si no hay credenciales válidas
            FactusAPIError: Si hay error en la API
        """
        logger.info(f"Sincronizando rangos para restaurante {restaurant_id}")
        
        # 1. Obtener credenciales del tenant
        restaurant = await self._get_restaurant_with_credentials(restaurant_id)
        if not restaurant:
            return SyncRangesResponse(
                success=False,
                message="Restaurante no encontrado",
                synced_count=0
            )
        
        if not self._has_valid_credentials(restaurant):
            return SyncRangesResponse(
                success=False,
                message="El restaurante no tiene credenciales de Factus configuradas",
                synced_count=0
            )
        
        # 2. Crear cliente Factus con credenciales del tenant
        try:
            ranges_data = await self._fetch_ranges_from_factus(restaurant)
        except (FactusAuthError, FactusAPIError) as e:
            logger.error(f"Error al obtener rangos de Factus: {e}")
            return SyncRangesResponse(
                success=False,
                message=f"Error de Factus: {str(e)}",
                synced_count=0
            )
        
        # 3. Upsert de rangos
        created_count = 0
        updated_count = 0
        synced_ranges = []
        
        for range_data in ranges_data:
            existing = await self._get_range_by_factus_id(
                range_data.id, 
                restaurant_id
            )
            
            if existing:
                # UPDATE
                updated_range = await self._update_range(existing, range_data)
                synced_ranges.append(updated_range)
                updated_count += 1
            else:
                # INSERT
                new_range = await self._create_range(range_data, restaurant_id)
                synced_ranges.append(new_range)
                created_count += 1
        
        await self._session.commit()
        
        logger.info(
            f"Sincronización completada: {created_count} creados, {updated_count} actualizados"
        )
        
        return SyncRangesResponse(
            success=True,
            message="Rangos sincronizados exitosamente",
            synced_count=len(ranges_data),
            created_count=created_count,
            updated_count=updated_count,
            ranges=[self._to_internal_schema(r) for r in synced_ranges]
        )
    
    async def _fetch_ranges_from_factus(
        self, 
        restaurant: Restaurant
    ) -> List[BillingRangeFactusResponse]:
        """
        Obtiene los rangos desde la API de Factus usando credenciales del tenant.
        
        IMPORTANTE: Las credenciales están encriptadas en la BD,
        se desencriptan aquí antes de usarlas.
        """
        # Desencriptar credenciales sensibles
        logger.info(f"Desencriptando credenciales de restaurant ID={restaurant.id}")
        try:
            decrypted_secret = decrypt_credential(restaurant.factus_client_secret)
            decrypted_password = decrypt_credential(restaurant.factus_password)
            logger.info(f"Credenciales desencriptadas OK: email={restaurant.factus_email}")
        except Exception as e:
            logger.error(f"Error al desencriptar credenciales: {e}")
            raise FactusAPIError(
                message=f"Error al desencriptar credenciales del restaurante: {str(e)}",
                status_code=500
            )
        
        # Crear settings temporales con credenciales desencriptadas
        temp_settings = Settings(
            factus_base_url=self._settings.factus_base_url,
            factus_client_id=restaurant.factus_client_id,
            factus_client_secret=decrypted_secret,
            factus_email=restaurant.factus_email,
            factus_password=decrypted_password,
        )
        
        async with httpx.AsyncClient() as http_client:
            client = FactusClient(http_client, temp_settings)
            response = await client.get("/v1/numbering-ranges")
        
        # Factus tiene una estructura anidada con paginación:
        # { "data": { "data": [...rangos...], "page": 1, ... } }
        # Extraer lista de rangos correctamente
        ranges_list = []
        
        if isinstance(response, dict):
            outer_data = response.get("data")
            
            if isinstance(outer_data, dict):
                # Estructura anidada: data.data contiene los rangos
                ranges_list = outer_data.get("data", [])
                logger.info(f"Estructura anidada detectada, page: {outer_data.get('page', 'N/A')}")
            elif isinstance(outer_data, list):
                # Estructura plana: data es directamente la lista
                ranges_list = outer_data
            else:
                logger.warning(f"Estructura inesperada de 'data': {type(outer_data)}")
        elif isinstance(response, list):
            ranges_list = response
        
        logger.info(f"Factus devolvió {len(ranges_list)} rangos")
        
        if ranges_list and len(ranges_list) > 0:
            logger.info(f"Primer rango: id={ranges_list[0].get('id')}, resolution={ranges_list[0].get('resolution_number')}")
        
        parsed_ranges = []
        for idx, item in enumerate(ranges_list):
            try:
                if not isinstance(item, dict):
                    logger.warning(f"Item {idx} no es dict ({type(item)}), saltando")
                    continue
                parsed_range = BillingRangeFactusResponse(**item)
                parsed_ranges.append(parsed_range)
            except Exception as e:
                logger.error(f"Error parseando rango {idx}: {e}")
                logger.debug(f"Item problemático: {item}")
                raise FactusAPIError(
                    message=f"Error parseando rango de Factus: {str(e)}",
                    status_code=500,
                    details=str(item)[:500]
                )
        
        return parsed_ranges
    
    async def _get_range_by_factus_id(
        self, 
        factus_id: int,
        restaurant_id: int
    ) -> Optional[BillingResolution]:
        """Busca un rango por su ID de Factus, filtrado por tenant."""
        result = await self._session.execute(
            select(BillingResolution).where(
                and_(
                    BillingResolution.factus_id == factus_id,
                    BillingResolution.restaurant_id == restaurant_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def _create_range(
        self, 
        data: BillingRangeFactusResponse,
        restaurant_id: int
    ) -> BillingResolution:
        """Crea un nuevo rango en la BD."""
        new_range = BillingResolution(
            factus_id=data.id,
            resolution_number=data.resolution_number,
            prefix=data.prefix,
            from_number=data.from_number,
            to_number=data.to_number,
            current_number=data.current,
            resolution_date=self._parse_date(data.resolution_date),
            expiration_date=self._parse_date(data.end_date),
            technical_key=data.technical_key,
            is_expired=data.is_expired,
            is_active=False,  # Por defecto inactivo, el admin debe activar
            last_synced_at=datetime.utcnow(),
            restaurant_id=restaurant_id
        )
        
        self._session.add(new_range)
        await self._session.flush()
        return new_range
    
    async def _update_range(
        self, 
        existing: BillingResolution,
        data: BillingRangeFactusResponse
    ) -> BillingResolution:
        """Actualiza un rango existente con datos de Factus."""
        existing.resolution_number = data.resolution_number
        existing.prefix = data.prefix
        existing.from_number = data.from_number
        existing.to_number = data.to_number
        existing.current_number = data.current
        existing.resolution_date = self._parse_date(data.resolution_date)
        existing.expiration_date = self._parse_date(data.end_date)
        existing.technical_key = data.technical_key
        existing.is_expired = data.is_expired
        existing.last_synced_at = datetime.utcnow()
        existing.updated_at = datetime.utcnow()
        
        await self._session.flush()
        return existing
    
    # =========================================================================
    # CONSULTAS LOCALES (MULTI-TENANT SEGURAS)
    # =========================================================================
    
    async def get_active_range_id(
        self, 
        restaurant_id: int
    ) -> Optional[ActiveRangeResponse]:
        """
        Obtiene el rango activo para un restaurante.
        
        CONSULTA ULTRA-RÁPIDA a la BD local.
        Esta función es llamada por el módulo de "Crear Factura".
        
        Args:
            restaurant_id: ID del restaurante/tenant
            
        Returns:
            Datos del rango activo o None si no hay ninguno válido
        """
        result = await self._session.execute(
            select(BillingResolution).where(
                and_(
                    BillingResolution.restaurant_id == restaurant_id,
                    BillingResolution.is_active == True,
                    BillingResolution.is_expired == False
                )
            )
        )
        
        resolution = result.scalar_one_or_none()
        
        if not resolution:
            return None
        
        return ActiveRangeResponse(
            factus_id=resolution.factus_id,
            prefix=resolution.prefix,
            resolution_number=resolution.resolution_number,
            current_number=resolution.current_number,
            remaining_numbers=resolution.remaining_numbers,
            is_valid=resolution.is_valid()
        )
    
    async def get_all_ranges(
        self, 
        restaurant_id: int
    ) -> List[BillingRangeInternal]:
        """
        Obtiene todos los rangos de un restaurante.
        
        Args:
            restaurant_id: ID del restaurante (SIEMPRE filtrar por tenant)
            
        Returns:
            Lista de rangos del restaurante
        """
        result = await self._session.execute(
            select(BillingResolution).where(
                BillingResolution.restaurant_id == restaurant_id
            ).order_by(BillingResolution.is_active.desc(), BillingResolution.created_at.desc())
        )
        
        resolutions = result.scalars().all()
        return [self._to_internal_schema(r) for r in resolutions]
    
    async def set_active_range(
        self, 
        restaurant_id: int,
        range_id: int
    ) -> bool:
        """
        Establece un rango como activo y desactiva los demás.
        
        Args:
            restaurant_id: ID del restaurante (seguridad multi-tenant)
            range_id: ID interno del rango a activar
            
        Returns:
            True si se activó correctamente
        """
        # Desactivar todos los rangos del restaurante
        all_ranges = await self._session.execute(
            select(BillingResolution).where(
                BillingResolution.restaurant_id == restaurant_id
            )
        )
        
        for resolution in all_ranges.scalars():
            resolution.is_active = (resolution.id == range_id)
            resolution.updated_at = datetime.utcnow()
        
        await self._session.commit()
        logger.info(f"Rango {range_id} activado para restaurante {restaurant_id}")
        return True
    
    async def increment_current_number(
        self,
        restaurant_id: int,
        range_id: int
    ) -> int:
        """
        Incrementa el número actual del rango después de facturar.
        
        Args:
            restaurant_id: ID del restaurante (seguridad)
            range_id: ID del rango
            
        Returns:
            Nuevo número actual
        """
        result = await self._session.execute(
            select(BillingResolution).where(
                and_(
                    BillingResolution.id == range_id,
                    BillingResolution.restaurant_id == restaurant_id
                )
            )
        )
        
        resolution = result.scalar_one_or_none()
        if resolution:
            resolution.current_number += 1
            resolution.updated_at = datetime.utcnow()
            await self._session.commit()
            return resolution.current_number
        
        return 0
    
    # =========================================================================
    # HELPERS
    # =========================================================================
    
    async def _get_restaurant_with_credentials(
        self, 
        restaurant_id: int
    ) -> Optional[Restaurant]:
        """Obtiene un restaurante por ID."""
        result = await self._session.execute(
            select(Restaurant).where(Restaurant.id == restaurant_id)
        )
        return result.scalar_one_or_none()
    
    def _has_valid_credentials(self, restaurant: Restaurant) -> bool:
        """Verifica si el restaurante tiene credenciales de Factus."""
        return all([
            restaurant.factus_client_id,
            restaurant.factus_client_secret,
            restaurant.factus_email,
            restaurant.factus_password
        ])
    
    def _parse_date(self, date_str: Optional[str]) -> Optional[date]:
        """Parsea una fecha desde string."""
        if not date_str:
            return None
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            try:
                return datetime.fromisoformat(date_str.replace("Z", "+00:00")).date()
            except ValueError:
                return None
    
    def _to_internal_schema(self, resolution: BillingResolution) -> BillingRangeInternal:
        """Convierte un modelo de BD a esquema interno."""
        return BillingRangeInternal(
            id=resolution.id,
            factus_id=resolution.factus_id,
            resolution_number=resolution.resolution_number,
            prefix=resolution.prefix,
            from_number=resolution.from_number,
            to_number=resolution.to_number,
            current_number=resolution.current_number,
            expiration_date=resolution.expiration_date,
            is_active=resolution.is_active,
            is_expired=resolution.is_expired,
            remaining_numbers=resolution.remaining_numbers,
            usage_percentage=resolution.usage_percentage
        )


# =============================================================================
# FACTORY / DEPENDENCY INJECTION
# =============================================================================

async def get_billing_range_service(
    session: AsyncSession
) -> BillingRangeService:
    """
    Factory para crear una instancia de BillingRangeService.
    
    Args:
        session: Sesión de BD inyectada
        
    Returns:
        Instancia configurada del servicio
    """
    settings = get_settings()
    return BillingRangeService(session, settings)
