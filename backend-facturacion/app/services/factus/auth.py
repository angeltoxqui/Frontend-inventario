"""
Gestor de autenticación OAuth2 para Factus.
Maneja obtención de tokens, renovación automática y verificación de expiración.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx

from app.core.config import Settings
from app.core.exceptions import FactusAuthError, FactusTokenExpiredError

logger = logging.getLogger(__name__)


class FactusAuthManager:
    """
    Gestor de autenticación para la API de Factus.
    
    Características:
    - Obtención de token via password grant
    - Renovación automática usando refresh_token
    - Verificación de expiración con margen de seguridad (5 min)
    - Thread-safe con asyncio.Lock
    """
    
    def __init__(self, client: httpx.AsyncClient, settings: Settings):
        """
        Inicializa el gestor de autenticación.
        
        Args:
            client: Cliente HTTP asíncrono para hacer las peticiones
            settings: Configuración con credenciales de Factus
        """
        self._client = client
        self._settings = settings
        
        # Estado del token
        self._access_token: Optional[str] = None
        self._refresh_token: Optional[str] = None
        self._expires_at: Optional[datetime] = None
        
        # Lock para thread-safety en operaciones de token
        self._lock = asyncio.Lock()
    
    @property
    def _auth_url(self) -> str:
        """URL del endpoint de autenticación OAuth2."""
        return f"{self._settings.factus_base_url}/oauth/token"
    
    def _is_token_valid(self) -> bool:
        """
        Verifica si el token actual es válido.
        Considera un margen de seguridad antes de la expiración.
        
        Returns:
            True si el token existe y no está por expirar, False en caso contrario
        """
        if not self._access_token or not self._expires_at:
            return False
        
        # Verificar con margen de seguridad
        margin = timedelta(seconds=self._settings.token_refresh_margin_seconds)
        return datetime.now() < (self._expires_at - margin)
    
    async def _login(self) -> None:
        """
        Obtiene un nuevo token usando password grant.
        
        Raises:
            FactusAuthError: Si las credenciales son inválidas o hay error de red
        """
        logger.info("Iniciando autenticación con Factus (password grant)")
        
        payload = {
            "grant_type": "password",
            "client_id": self._settings.factus_client_id,
            "client_secret": self._settings.factus_client_secret,
            "username": self._settings.factus_email,
            "password": self._settings.factus_password,
        }
        
        try:
            response = await self._client.post(
                self._auth_url,
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code != 200:
                error_detail = response.text
                logger.error(f"Error de autenticación Factus: {response.status_code} - {error_detail}")
                raise FactusAuthError(
                    message=f"Error de autenticación: {response.status_code}",
                    status_code=response.status_code,
                    details=error_detail
                )
            
            data = response.json()
            self._store_token(data)
            logger.info("Autenticación exitosa con Factus")
            
        except httpx.RequestError as e:
            logger.error(f"Error de conexión al autenticar con Factus: {e}")
            raise FactusAuthError(
                message="No se pudo conectar con Factus para autenticación",
                details=str(e)
            )
    
    async def _refresh(self) -> None:
        """
        Renueva el token usando refresh_token.
        Si falla, intenta login completo.
        
        Raises:
            FactusAuthError: Si no se puede renovar ni re-autenticar
        """
        if not self._refresh_token:
            logger.warning("No hay refresh_token disponible, realizando login completo")
            await self._login()
            return
        
        logger.info("Renovando token de Factus (refresh_token grant)")
        
        payload = {
            "grant_type": "refresh_token",
            "client_id": self._settings.factus_client_id,
            "client_secret": self._settings.factus_client_secret,
            "refresh_token": self._refresh_token,
        }
        
        try:
            response = await self._client.post(
                self._auth_url,
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code != 200:
                logger.warning(f"Refresh token falló ({response.status_code}), intentando login completo")
                # Limpiar tokens inválidos
                self._access_token = None
                self._refresh_token = None
                self._expires_at = None
                # Intentar login completo
                await self._login()
                return
            
            data = response.json()
            self._store_token(data)
            logger.info("Token renovado exitosamente")
            
        except httpx.RequestError as e:
            logger.error(f"Error de conexión al renovar token: {e}")
            raise FactusAuthError(
                message="No se pudo renovar el token de Factus",
                details=str(e)
            )
    
    def _store_token(self, data: dict) -> None:
        """
        Almacena los datos del token en memoria.
        
        Args:
            data: Respuesta del endpoint OAuth2 con access_token, refresh_token, expires_in
        """
        self._access_token = data.get("access_token")
        self._refresh_token = data.get("refresh_token")
        
        # Calcular tiempo de expiración
        expires_in = data.get("expires_in", 3600)  # Default 1 hora
        self._expires_at = datetime.now() + timedelta(seconds=expires_in)
        
        logger.debug(f"Token almacenado, expira en {expires_in} segundos")
    
    async def get_valid_token(self) -> str:
        """
        Obtiene un token válido, renovándolo si es necesario.
        
        Este es el método principal que debe usarse antes de cada petición a la API.
        Es thread-safe y maneja automáticamente la renovación.
        
        Returns:
            Token de acceso válido
            
        Raises:
            FactusAuthError: Si no se puede obtener un token válido
            FactusTokenExpiredError: Si el token expiró y no se pudo renovar
        """
        async with self._lock:
            if self._is_token_valid():
                return self._access_token
            
            # Token no válido o por expirar
            if self._refresh_token:
                logger.info("Token próximo a expirar, renovando...")
                await self._refresh()
            else:
                logger.info("No hay token válido, realizando login...")
                await self._login()
            
            if not self._access_token:
                raise FactusTokenExpiredError(
                    message="No se pudo obtener un token válido de Factus"
                )
            
            return self._access_token
    
    async def invalidate(self) -> None:
        """
        Invalida el token actual, forzando re-autenticación en la próxima petición.
        Útil cuando se recibe un 401 de la API.
        """
        async with self._lock:
            logger.info("Invalidando token de Factus")
            self._access_token = None
            self._refresh_token = None
            self._expires_at = None
    
    @property
    def is_authenticated(self) -> bool:
        """Indica si hay un token válido disponible."""
        return self._is_token_valid()
    
    @property
    def token_expires_at(self) -> Optional[datetime]:
        """Fecha y hora de expiración del token actual."""
        return self._expires_at
