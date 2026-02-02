"""
Cliente HTTP de bajo nivel para la API de Factus.
Maneja autenticación automática, logging y errores.
"""

import logging
from typing import Any, Optional

import httpx

from app.core.config import Settings
from app.core.exceptions import (
    FactusAPIError,
    FactusAuthError,
    FactusConnectionError,
    FactusValidationError,
)
from app.services.factus.auth import FactusAuthManager

logger = logging.getLogger(__name__)


class FactusClient:
    """
    Cliente HTTP asíncrono para la API de Factus.
    
    Características:
    - Inyección automática de token Bearer
    - Manejo centralizado de errores HTTP
    - Logging de peticiones/respuestas
    - Reintentos en caso de token expirado
    """
    
    def __init__(self, client: httpx.AsyncClient, settings: Settings):
        """
        Inicializa el cliente de Factus.
        
        Args:
            client: Cliente HTTP asíncrono
            settings: Configuración de la aplicación
        """
        self._client = client
        self._settings = settings
        self._auth_manager = FactusAuthManager(client, settings)
    
    @property
    def _base_url(self) -> str:
        """URL base de la API de Factus."""
        return self._settings.factus_base_url
    
    async def _get_headers(self) -> dict:
        """
        Construye los headers para las peticiones, incluyendo el token.
        
        Returns:
            Diccionario con headers HTTP
        """
        token = await self._auth_manager.get_valid_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            # "Accept": "application/json",  # Comentado por posible conflicto con Factus PHP/Legacy
        }
    
    def _handle_error_response(
        self, 
        response: httpx.Response, 
        endpoint: str
    ) -> None:
        """
        Procesa respuestas de error y lanza excepciones apropiadas.
        
        Args:
            response: Respuesta HTTP con código de error
            endpoint: Endpoint que produjo el error
            
        Raises:
            FactusAuthError: Para errores 401
            FactusValidationError: Para errores 422
            FactusAPIError: Para otros errores 4xx/5xx
        """
        status_code = response.status_code
        
        try:
            error_data = response.json()
            error_message = error_data.get("message", response.text)
            error_details = error_data.get("errors", error_data)
        except Exception:
            error_message = response.text or f"Error HTTP {status_code}"
            error_details = None
        
        logger.error(
            f"Error en Factus API [{status_code}] {endpoint}: {error_message}"
        )
        
        if status_code == 401:
            raise FactusAuthError(
                message="Token de acceso inválido o expirado",
                status_code=status_code,
                details=error_details
            )
        elif status_code == 422:
            raise FactusValidationError(
                message=f"Error de validación: {error_message}",
                details=error_details
            )
        elif status_code == 404:
            raise FactusAPIError(
                message=f"Recurso no encontrado: {endpoint}",
                status_code=status_code,
                endpoint=endpoint
            )
        elif 400 <= status_code < 500:
            raise FactusAPIError(
                message=f"Error del cliente: {error_message}",
                status_code=status_code,
                details=error_details,
                endpoint=endpoint
            )
        else:  # 5xx
            raise FactusAPIError(
                message=f"Error del servidor de Factus: {error_message}",
                status_code=status_code,
                details=error_details,
                endpoint=endpoint
            )
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[dict] = None,
        params: Optional[dict] = None,
        retry_on_auth_error: bool = True
    ) -> Any:
        """
        Realiza una petición HTTP a la API de Factus.
        
        Args:
            method: Método HTTP (GET, POST, PUT, DELETE)
            endpoint: Ruta del endpoint (sin base URL)
            data: Datos para el body (JSON)
            params: Parámetros de query string
            retry_on_auth_error: Si True, reintenta una vez si hay error 401
            
        Returns:
            Respuesta JSON de la API
            
        Raises:
            FactusAPIError: Si hay error en la petición
            FactusConnectionError: Si hay error de red
        """
        url = f"{self._base_url}{endpoint}"
        
        logger.debug(f"Factus API [{method}] {endpoint}")
        
        try:
            headers = await self._get_headers()
            
            # No enviar Content-Type si no hay body (ej: GET)
            if data is None and "Content-Type" in headers:
                del headers["Content-Type"]
            
            response = await self._client.request(
                method=method,
                url=url,
                json=data if data else None,
                params=params,
                headers=headers,
                timeout=30.0
            )
            
            # Manejo especial para 401: invalidar token y reintentar
            if response.status_code == 401 and retry_on_auth_error:
                logger.warning("Token rechazado, invalidando y reintentando...")
                await self._auth_manager.invalidate()
                return await self._request(
                    method, endpoint, data, params, 
                    retry_on_auth_error=False
                )
            
            # Procesar errores
            if response.status_code >= 400:
                self._handle_error_response(response, endpoint)
            
            # Respuesta exitosa
            if response.status_code == 204:  # No content
                return None
            
            result = response.json()
            logger.debug(f"Factus API respuesta exitosa: {endpoint}")
            return result
            
        except httpx.TimeoutException:
            logger.error(f"Timeout en petición a Factus: {endpoint}")
            raise FactusConnectionError(
                message=f"Timeout al conectar con Factus: {endpoint}"
            )
        except httpx.RequestError as e:
            logger.error(f"Error de conexión con Factus: {e}")
            raise FactusConnectionError(
                message="No se pudo conectar con Factus",
                details=str(e)
            )
    
    # =========================================================================
    # MÉTODOS PÚBLICOS DE CONVENIENCIA
    # =========================================================================
    
    async def get(
        self, 
        endpoint: str, 
        params: Optional[dict] = None
    ) -> Any:
        """Realiza una petición GET."""
        return await self._request("GET", endpoint, params=params)
    
    async def post(
        self, 
        endpoint: str, 
        data: Optional[dict] = None
    ) -> Any:
        """Realiza una petición POST."""
        return await self._request("POST", endpoint, data=data)
    
    async def put(
        self, 
        endpoint: str, 
        data: Optional[dict] = None
    ) -> Any:
        """Realiza una petición PUT."""
        return await self._request("PUT", endpoint, data=data)
    
    async def delete(
        self, 
        endpoint: str
    ) -> Any:
        """Realiza una petición DELETE."""
        return await self._request("DELETE", endpoint)
    
    @property
    def auth_manager(self) -> FactusAuthManager:
        """Acceso al gestor de autenticación."""
        return self._auth_manager
