"""
Esquemas Pydantic para gestión de restaurantes (tenants).
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator
import re


def sanitize_text(value: str) -> str:
    """Limpia texto de caracteres peligrosos."""
    if not value:
        return value
    cleaned = re.sub(r'[<>"\'\{\}\[\]\\]', '', value)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    return cleaned.strip()


# =============================================================================
# ESQUEMAS DE CREACIÓN/ONBOARDING
# =============================================================================

class RestaurantCreate(BaseModel):
    """
    Esquema para registrar un nuevo restaurante en el sistema.
    Las credenciales de Factus serán encriptadas antes de guardar.
    """
    
    # Datos del negocio
    name: str = Field(
        ..., 
        min_length=2, 
        max_length=255,
        description="Nombre del restaurante"
    )
    nit: str = Field(
        ..., 
        min_length=5, 
        max_length=20,
        description="NIT del restaurante (sin DV)"
    )
    
    # Credenciales de Factus (será encriptadas)
    factus_client_id: str = Field(
        ..., 
        min_length=10,
        description="Client ID de Factus"
    )
    factus_client_secret: str = Field(
        ..., 
        min_length=10,
        description="Client Secret de Factus (será encriptado)"
    )
    factus_email: EmailStr = Field(
        ..., 
        description="Email de autenticación en Factus"
    )
    factus_password: str = Field(
        ..., 
        min_length=4,
        description="Password de Factus (será encriptado)"
    )
    
    @field_validator('name')
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        return sanitize_text(v)
    
    @field_validator('nit')
    @classmethod
    def validate_nit(cls, v: str) -> str:
        # Solo números
        cleaned = re.sub(r'\D', '', v)
        if len(cleaned) < 5:
            raise ValueError("NIT debe tener al menos 5 dígitos")
        return cleaned


class RestaurantUpdate(BaseModel):
    """Esquema para actualizar un restaurante."""
    
    name: Optional[str] = Field(default=None, max_length=255)
    
    # Solo credenciales si se van a actualizar
    factus_client_id: Optional[str] = None
    factus_client_secret: Optional[str] = None
    factus_email: Optional[EmailStr] = None
    factus_password: Optional[str] = None
    
    is_active: Optional[bool] = None


# =============================================================================
# ESQUEMAS DE RESPUESTA
# =============================================================================

class RestaurantResponse(BaseModel):
    """
    Respuesta pública de restaurante.
    NUNCA expone credenciales, solo indica si están configuradas.
    """
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    nit: str
    is_active: bool
    has_factus_credentials: bool = Field(
        default=False,
        description="Indica si tiene credenciales de Factus configuradas"
    )
    created_at: datetime
    updated_at: Optional[datetime] = None


class RestaurantListResponse(BaseModel):
    """Lista de restaurantes."""
    
    total: int
    restaurants: list[RestaurantResponse]


class RestaurantCredentialsStatus(BaseModel):
    """Estado de las credenciales de Factus."""
    
    restaurant_id: int
    has_credentials: bool
    can_authenticate: bool = False
    message: str


# =============================================================================
# ESQUEMAS PARA ORDENES (FACTURACIÓN)
# =============================================================================

class RestaurantOrderItemSchema(BaseModel):
    """Ítem de una orden de restaurante para facturar."""
    
    id: str = Field(..., description="ID del producto")
    name: str = Field(..., description="Nombre del producto")
    price: float = Field(..., ge=0, description="Precio unitario")
    quantity: int = Field(default=1, gt=0, description="Cantidad")
    is_taxed: bool = Field(default=True, description="¿Tiene impuestos?")
    tax_type: Optional[str] = Field(default=None, description="Tipo de impuesto: 'IVA' o 'ICO'. Si es null y is_taxed=True, por defecto ICO.")
