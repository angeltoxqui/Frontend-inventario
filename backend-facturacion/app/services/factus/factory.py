"""
Factory para crear instancias de FactusService configuradas para un Tenant específico.
Implementa el patrón Factory para manejar la complejidad de la configuración multi-tenant
y la seguridad de las credenciales.
"""

import logging
import httpx
from fastapi import HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.encryption import decrypt_credential, get_encryptor
from app.db.models import Restaurant
from app.services.factus.client import FactusClient
from app.services.factus.service import FactusService

logger = logging.getLogger(__name__)


class FactusServiceFactory:
    """
    Factory para construir instancias de FactusService.
    Maneja la obtención de credenciales del tenant y su desencriptación.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_service_for_tenant(self, tenant_id: int) -> FactusService:
        """
        Crea un servicio de Factus configurado con las credenciales del restaurante/tenant.

        Args:
            tenant_id: ID del restaurante (Tenant)

        Returns:
            Instancia configurada de FactusService

        Raises:
            HTTPException: Si el tenant no existe o faltan credenciales
        """
        # 1. Buscar tenant en BD
        stmt = select(Restaurant).where(Restaurant.id == tenant_id)
        result = await self.session.exec(stmt)
        restaurant = result.first()

        if not restaurant:
            logger.error(f"Tenant ID {tenant_id} no encontrado.")
            raise HTTPException(status_code=404, detail="Restaurante no encontrado")

        if not restaurant.is_active:
            logger.warning(f"Intento de usar tenant inactivo: {restaurant.name} ({tenant_id})")
            raise HTTPException(status_code=400, detail="El restaurante está inactivo")

        # 2. Validar existencia de credenciales
        if not all([
            restaurant.factus_client_id,
            restaurant.factus_client_secret,
            restaurant.factus_email,
            restaurant.factus_password
        ]):
            logger.error(f"Credenciales incompletas para tenant {tenant_id}")
            raise HTTPException(
                status_code=500,
                detail="El restaurante no tiene configuradas las credenciales de facturación"
            )

        # 3. Desencriptar credenciales
        # Nota: Asumimos que client_secret y password siempre están encriptados.
        # client_id y email podrían no estarlo, pero verificamos por seguridad.
        
        encryptor = get_encryptor()
        
        try:
            client_id = restaurant.factus_client_id
            if encryptor.is_encrypted(client_id):
                client_id = decrypt_credential(client_id)
                
            client_secret = restaurant.factus_client_secret
            if encryptor.is_encrypted(client_secret):
                client_secret = decrypt_credential(client_secret)
                
            email = restaurant.factus_email
            if encryptor.is_encrypted(email):
                email = decrypt_credential(email)
                
            password = restaurant.factus_password
            if encryptor.is_encrypted(password):
                password = decrypt_credential(password)
                
        except Exception as e:
            logger.error(f"Error al desencriptar credenciales del tenant {tenant_id}: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Error de seguridad con las credenciales del facturador"
            )

        # 4. Crear configuración efímera
        # Hereda defaults del entorno pero sobreescribe auth con datos del tenant
        tenant_settings = Settings(
            factus_client_id=client_id,
            factus_client_secret=client_secret,
            factus_email=email,
            factus_password=password
        )

        # 5. Instanciar Cliente y Servicio
        # Importante: Creamos un nuevo AsyncClient que debe ser cerrado por el consumidor
        # (Usando service.close() o async context manager)
        http_client = httpx.AsyncClient()
        client = FactusClient(http_client, tenant_settings)
        
        return FactusService(client, tenant_settings)
