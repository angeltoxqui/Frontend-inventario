"""
Configuración centralizada para la integración con Factus.
Utiliza Pydantic Settings para cargar variables de entorno de forma segura.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Configuración de la aplicación cargada desde variables de entorno."""
    
    # Factus API Configuration
    factus_base_url: str = Field(
        default="https://api-sandbox.factus.com.co",
        description="URL base de la API de Factus"
    )
    factus_client_id: str = Field(
        ...,
        description="Client ID de Factus (OAuth2)"
    )
    factus_client_secret: str = Field(
        ...,
        description="Client Secret de Factus (OAuth2)"
    )
    factus_email: str = Field(
        ...,
        description="Email/Usuario para autenticación en Factus"
    )
    factus_password: str = Field(
        ...,
        description="Contraseña para autenticación en Factus"
    )
    
    # Token Configuration
    token_refresh_margin_seconds: int = Field(
        default=300,
        description="Margen en segundos antes de expiración para renovar token (5 min)"
    )
    
    # Supabase Auth
    supabase_jwt_secret: str = Field(
        ...,
        description="Secreto para verificar tokens JWT de Supabase"
    )
    
    # Tax Configuration
    impoconsumo_rate: float = Field(
        default=8.0,
        description="Tasa de Impoconsumo para restaurantes (%)"
    )
    iva_rate: float = Field(
        default=19.0,
        description="Tasa de IVA estándar (%)"
    )
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "allow"  # Permitir campos extra para credenciales de tenant


@lru_cache()
def get_settings() -> Settings:
    """
    Obtiene la configuración de la aplicación (cacheada).
    Usar esta función para dependency injection en FastAPI.
    """
    return Settings()
