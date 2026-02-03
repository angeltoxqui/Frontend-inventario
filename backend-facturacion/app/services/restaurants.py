"""
Servicio de gestión de restaurantes (tenants).
Implementa CRUD con encriptación de credenciales.
"""

import logging
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.encryption import encrypt_credential, decrypt_credential
from app.db.models import Tenant
from app.schemas.restaurants import (
    RestaurantCreate,
    RestaurantUpdate,
    RestaurantResponse,
)

logger = logging.getLogger(__name__)


class RestaurantService:
    """
    Servicio para gestión de restaurantes/tenants.
    
    Características:
    - CRUD completo
    - Encriptación automática de credenciales sensibles
    - Validación de unicidad de NIT
    """
    
    def __init__(self, session: AsyncSession, settings: Settings):
        self._session = session
        self._settings = settings
    
    # =========================================================================
    # CRUD
    # =========================================================================
    
    async def create(self, data: RestaurantCreate) -> Tenant:
        """
        Crea un nuevo restaurante con credenciales encriptadas.
        
        Args:
            data: Datos del restaurante incluyendo credenciales en texto plano
            
        Returns:
            Restaurante creado
            
        Raises:
            ValueError: Si el NIT ya existe
        """
        # Verificar unicidad de NIT
        existing = await self.get_by_nit(data.nit)
        if existing:
            raise ValueError(f"Ya existe un restaurante con NIT {data.nit}")
        
        # Encriptar credenciales sensibles
        encrypted_secret = encrypt_credential(data.factus_client_secret)
        encrypted_password = encrypt_credential(data.factus_password)
        
        logger.info(f"Creando restaurante: {data.name} (NIT: {data.nit})")
        
        restaurant = Tenant(
            name=data.name,
            nit=data.nit,
            factus_client_id=data.factus_client_id,
            factus_client_secret=encrypted_secret,
            factus_email=data.factus_email,
            factus_password=encrypted_password,
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        self._session.add(restaurant)
        await self._session.commit()
        await self._session.refresh(restaurant)
        
        logger.info(f"Restaurante creado con ID: {restaurant.id}")
        return restaurant
    
    async def get_by_id(self, restaurant_id: int) -> Optional[Tenant]:
        """Obtiene un restaurante por ID."""
        result = await self._session.execute(
            select(Tenant).where(Tenant.id == restaurant_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_nit(self, nit: str) -> Optional[Tenant]:
        """Obtiene un restaurante por NIT."""
        result = await self._session.execute(
            select(Tenant).where(Tenant.nit == nit)
        )
        return result.scalar_one_or_none()
    
    async def get_all(self, active_only: bool = True) -> List[Tenant]:
        """Obtiene todos los restaurantes."""
        query = select(Tenant)
        if active_only:
            query = query.where(Tenant.is_active == True)
        query = query.order_by(Tenant.created_at.desc())
        
        result = await self._session.execute(query)
        return list(result.scalars().all())
    
    async def update(
        self, 
        restaurant_id: int, 
        data: RestaurantUpdate
    ) -> Optional[Tenant]:
        """
        Actualiza un restaurante.
        Si se actualizan credenciales, serán encriptadas.
        """
        restaurant = await self.get_by_id(restaurant_id)
        if not restaurant:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        
        # Encriptar si se actualizan credenciales sensibles
        if "factus_client_secret" in update_data and update_data["factus_client_secret"]:
            update_data["factus_client_secret"] = encrypt_credential(
                update_data["factus_client_secret"]
            )
        
        if "factus_password" in update_data and update_data["factus_password"]:
            update_data["factus_password"] = encrypt_credential(
                update_data["factus_password"]
            )
        
        for key, value in update_data.items():
            setattr(restaurant, key, value)
        
        restaurant.updated_at = datetime.utcnow()
        
        await self._session.commit()
        await self._session.refresh(restaurant)
        
        logger.info(f"Restaurante {restaurant_id} actualizado")
        return restaurant
    
    async def delete(self, restaurant_id: int) -> bool:
        """Elimina un restaurante (soft delete: is_active=False)."""
        restaurant = await self.get_by_id(restaurant_id)
        if not restaurant:
            return False
        
        restaurant.is_active = False
        restaurant.updated_at = datetime.utcnow()
        
        await self._session.commit()
        logger.info(f"Restaurante {restaurant_id} desactivado")
        return True
    
    # =========================================================================
    # CREDENCIALES (DESENCRIPTADAS)
    # =========================================================================
    
    async def get_decrypted_credentials(
        self, 
        restaurant_id: int
    ) -> Optional[dict]:
        """
        Obtiene las credenciales de Factus desencriptadas.
        
        SOLO para uso interno (autenticación con Factus).
        NUNCA exponer al frontend.
        
        Returns:
            Dict con client_id, client_secret, email, password
        """
        restaurant = await self.get_by_id(restaurant_id)
        if not restaurant:
            return None
        
        if not self._has_credentials(restaurant):
            return None
        
        try:
            return {
                "client_id": restaurant.factus_client_id,
                "client_secret": decrypt_credential(restaurant.factus_client_secret),
                "email": restaurant.factus_email,
                "password": decrypt_credential(restaurant.factus_password),
            }
        except ValueError as e:
            logger.error(f"Error desencriptando credenciales: {e}")
            return None
    
    def _has_credentials(self, restaurant: Tenant) -> bool:
        """Verifica si el restaurante tiene credenciales configuradas."""
        return all([
            restaurant.factus_client_id,
            restaurant.factus_client_secret,
            restaurant.factus_email,
            restaurant.factus_password
        ])
    
    # =========================================================================
    # HELPERS
    # =========================================================================
    
    def to_response(self, restaurant: Tenant) -> RestaurantResponse:
        """Convierte modelo a respuesta (sin credenciales)."""
        return RestaurantResponse(
            id=restaurant.id,
            name=restaurant.name,
            nit=restaurant.nit,
            is_active=restaurant.is_active,
            has_factus_credentials=self._has_credentials(restaurant),
            created_at=restaurant.created_at,
            updated_at=restaurant.updated_at
        )


# =============================================================================
# DEPENDENCY INJECTION
# =============================================================================

async def get_restaurant_service(
    session: AsyncSession
) -> RestaurantService:
    """Factory para inyección de dependencias."""
    settings = get_settings()
    return RestaurantService(session, settings)
