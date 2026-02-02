"""
Esquemas Pydantic para gestión de rangos de numeración DIAN.
Incluye mapeo de respuestas de Factus y modelos internos.
"""

from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


# =============================================================================
# ESQUEMAS DE RESPUESTA DE FACTUS
# =============================================================================

class BillingRangeFactusResponse(BaseModel):
    """
    Mapeo exacto de la respuesta del endpoint GET /v1/numbering-ranges de Factus.
    """
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    
    id: int = Field(..., description="ID del rango en Factus")
    document: Optional[str] = Field(default=None, description="Tipo de documento")
    prefix: Optional[str] = Field(default=None, description="Prefijo de la factura")
    
    # Usando alias para campos con nombres de palabras reservadas
    from_number: Optional[int] = Field(default=None, alias="from", description="Número inicial")
    to_number: Optional[int] = Field(default=None, alias="to", description="Número final")
    current: Optional[int] = Field(default=0, description="Número actual")
    
    resolution_number: Optional[str] = Field(default=None, description="Número de resolución DIAN")
    resolution_date: Optional[str] = Field(default=None, description="Fecha de resolución")
    technical_key: Optional[str] = Field(default=None, description="Clave técnica")
    
    start_date: Optional[str] = Field(default=None, description="Fecha de inicio")
    end_date: Optional[str] = Field(default=None, description="Fecha de fin/expiración")
    
    is_expired: bool = Field(default=False, description="Si el rango está vencido")


class FactusRangesAPIResponse(BaseModel):
    """Respuesta completa del endpoint de rangos de Factus."""
    
    status: Optional[str] = None
    message: Optional[str] = None
    data: List[BillingRangeFactusResponse] = Field(default_factory=list)


# =============================================================================
# ESQUEMAS INTERNOS
# =============================================================================

class BillingRangeInternal(BaseModel):
    """
    Modelo interno para uso en el POS.
    Versión simplificada para operaciones rápidas.
    """
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    factus_id: int
    resolution_number: Optional[str] = None
    prefix: Optional[str] = None
    from_number: Optional[int] = None
    to_number: Optional[int] = None
    current_number: Optional[int] = None
    expiration_date: Optional[date] = None
    is_active: bool
    is_expired: bool
    remaining_numbers: int
    usage_percentage: float
    

class BillingRangeCreate(BaseModel):
    """Esquema para crear un rango manualmente (admin)."""
    
    factus_id: int
    resolution_number: str
    prefix: Optional[str] = None
    from_number: int
    to_number: int
    current_number: int = 0
    resolution_date: Optional[date] = None
    expiration_date: Optional[date] = None
    technical_key: Optional[str] = None
    is_active: bool = False


class BillingRangeUpdate(BaseModel):
    """Esquema para actualizar un rango."""
    
    current_number: Optional[int] = None
    is_active: Optional[bool] = None
    expiration_date: Optional[date] = None


class ActiveRangeResponse(BaseModel):
    """Respuesta rápida con el rango activo para facturar."""
    
    factus_id: int
    prefix: Optional[str]
    resolution_number: Optional[str]
    current_number: Optional[int]
    remaining_numbers: int
    is_valid: bool


# =============================================================================
# ESQUEMAS DE RESTAURANTE/TENANT
# =============================================================================

class RestaurantBase(BaseModel):
    """Base para datos de restaurante."""
    
    name: str = Field(..., max_length=255)
    nit: str = Field(..., max_length=20)


class RestaurantCreate(RestaurantBase):
    """Esquema para crear un restaurante."""
    
    factus_client_id: Optional[str] = None
    factus_client_secret: Optional[str] = None
    factus_email: Optional[str] = None
    factus_password: Optional[str] = None


class RestaurantFactusCredentials(BaseModel):
    """Credenciales de Factus para un restaurante."""
    
    client_id: str
    client_secret: str
    email: str
    password: str


class RestaurantResponse(RestaurantBase):
    """Respuesta con datos del restaurante."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    is_active: bool
    has_factus_credentials: bool = False
    active_resolution: Optional[BillingRangeInternal] = None


# =============================================================================
# ESQUEMAS DE SINCRONIZACIÓN
# =============================================================================

class SyncRangesRequest(BaseModel):
    """Request para sincronizar rangos."""
    
    restaurant_id: int = Field(..., description="ID del restaurante/tenant")
    

class SyncRangesResponse(BaseModel):
    """Respuesta de sincronización de rangos."""
    
    success: bool
    message: str
    synced_count: int = 0
    created_count: int = 0
    updated_count: int = 0
    ranges: List[BillingRangeInternal] = Field(default_factory=list)
