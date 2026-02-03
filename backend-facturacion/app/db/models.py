"""
Modelos de base de datos para el sistema Multi-Tenant de facturación.
"""

from datetime import date, datetime
from typing import Optional, List
from decimal import Decimal

from sqlmodel import SQLModel, Field, Relationship



# =============================================================================
# MODELO: TENANT (Antes Restaurant)
# =============================================================================

class Tenant(SQLModel, table=True):
    """
    Representa un tenant (negocio/restaurante) en el sistema.
    Base de datos: 'tenants' (compartida con Supabase Auth/Public).
    """
    __tablename__ = "tenants"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Identificación del tenant
    name: str = Field(max_length=255, index=True)
    nit: Optional[str] = Field(default=None, max_length=20, unique=True, index=True) # Puede ser nulo al inicio
    
    # Credenciales de Factus (encriptadas en producción)
    # Son opcionales porque un tenant puede no tener facturación activa
    factus_client_id: Optional[str] = Field(default=None, max_length=255)
    factus_client_secret: Optional[str] = Field(default=None, max_length=255)
    factus_email: Optional[str] = Field(default=None, max_length=255)
    factus_password: Optional[str] = Field(default=None, max_length=255)
    
    # Flags configuración
    billing_active: bool = Field(default=False)
    
    # Estado (Compatibilidad)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
    
    # Relación con rangos de numeración
    billing_resolutions: List["BillingResolution"] = Relationship(back_populates="tenant")


# =============================================================================
# MODELO: BILLING RESOLUTION (RANGO DE NUMERACIÓN DIAN)
# =============================================================================

class BillingResolution(SQLModel, table=True):
    """
    Rango de numeración autorizado por la DIAN.
    """
    __tablename__ = "billing_resolutions"
    
    # ID interno
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # ID del rango en Factus (VITAL para enviar facturas)
    factus_id: int = Field(index=True, unique=True)
    
    # Datos de la resolución DIAN
    resolution_number: Optional[str] = Field(default=None, max_length=100, description="Número de resolución DIAN")
    prefix: Optional[str] = Field(default=None, max_length=10, description="Prefijo (ej: SETT)")
    
    # Rango de numeración
    number_from: Optional[int] = Field(default=0, description="Número inicial del rango")
    number_to: Optional[int] = Field(default=0, description="Número final del rango")
    current_number: Optional[int] = Field(default=0, description="Consecutivo actual (control local)")
    
    # Fechas
    resolution_date: Optional[date] = Field(default=None, description="Fecha de la resolución")
    expiration_date: Optional[date] = Field(default=None, description="Fecha de vencimiento")
    
    # Clave técnica (para validación DIAN)
    technical_key: Optional[str] = Field(default=None, max_length=255)
    
    # Estado
    is_active: bool = Field(default=False, index=True, description="Solo uno activo por restaurante")
    is_expired: bool = Field(default=False, description="Indica si el rango está vencido")
    
    # Auditoría
    last_synced_at: Optional[datetime] = Field(default=None, description="Última sincronización con Factus")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
    
    # Relación con Tenant (Foreign Key)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
    tenant: Optional[Tenant] = Relationship(back_populates="billing_resolutions")
    
    def is_valid(self) -> bool:
        """
        Verifica si el rango es válido para facturar:
        - Está activo
        - No ha expirado
        - Tiene números disponibles
        """
        if not self.is_active or self.is_expired:
            return False
        
        if self.expiration_date and self.expiration_date < date.today():
            return False
        
        if self.current_number >= self.number_to:
            return False
        
        return True
    
    @property
    def remaining_numbers(self) -> int:
        """Números restantes en el rango."""
        if self.number_to is None or self.current_number is None:
            return 0
        return max(0, self.number_to - self.current_number)
    
    @property
    def usage_percentage(self) -> float:
        """Porcentaje de uso del rango."""
        if self.number_to is None or self.number_from is None:
            return 0.0
            
        total = self.number_to - self.number_from
        if total <= 0:
            return 100.0
        
        current = self.current_number or self.number_from
        used = current - self.number_from
        return (used / total) * 100


# =============================================================================
# MODELO: INVOICE (FACTURA)
# =============================================================================

class Invoice(SQLModel, table=True):
    """
    Representa una factura generada en el sistema.
    Almacena el estado del proceso (Creada -> Validada).
    """
    __tablename__ = "invoices"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Identificadores Factus/DIAN
    number: str = Field(index=True, description="Número de factura (con prefijo)")
    cufe: Optional[str] = Field(default=None, index=True)
    factus_id: Optional[int] = Field(default=None, description="ID interno en Factus")
    
    # Referencia interna (Orden)
    order_reference: str = Field(index=True, description="ID de la orden de restaurante")
    
    # Monto Total
    total: Decimal = Field(default=0, max_digits=20, decimal_places=2)
    
    # Estado: CREATED, VALIDATED, ERROR, ANNULLED
    status: str = Field(default="CREATED", index=True)
    
    # Tipo de documento: INVOICE, CREDIT_NOTE
    document_type: str = Field(default="INVOICE", index=True)
    
    # Relación con factura original (si es Nota Crédito)
    related_invoice_id: Optional[int] = Field(default=None, foreign_key="invoices.id", nullable=True)
    
    # URL de documentos
    pdf_url: Optional[str] = Field(default=None)
    xml_url: Optional[str] = Field(default=None)
    qr_url: Optional[str] = Field(default=None, description="URL/Contenido del código QR")
    
    # Errores/Detalles
    api_response: Optional[str] = Field(default=None, description="Respuesta JSON raw (pudiera ser larga)")
    
    # Fechas
    created_at: datetime = Field(default_factory=datetime.utcnow)
    validated_at: Optional[datetime] = Field(default=None)
    
    # Relación con Tenant
    tenant_id: int = Field(foreign_key="tenants.id", index=True)
