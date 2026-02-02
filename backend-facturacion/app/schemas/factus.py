"""
Modelos Pydantic para la integración con Factus.
Incluye validación estricta, sanitización de inputs y estructura JSON para facturas.
"""

import re
from decimal import Decimal
from typing import Optional, List, Any
from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator, EmailStr, ConfigDict


# =============================================================================
# UTILIDADES DE SANITIZACIÓN
# =============================================================================

def sanitize_text(value: str) -> str:
    """
    Limpia texto de caracteres potencialmente peligrosos.
    Previene inyecciones y caracteres inválidos en la API.
    """
    if not value:
        return value
    # Eliminar caracteres peligrosos
    cleaned = re.sub(r'[<>"\'\{\}\[\]\\]', '', value)
    # Normalizar espacios múltiples
    cleaned = re.sub(r'\s+', ' ', cleaned)
    return cleaned.strip()


def sanitize_numeric_string(value: str) -> str:
    """Extrae solo dígitos de una cadena."""
    return re.sub(r'\D', '', value)


# =============================================================================
# MODELOS DE AUTENTICACIÓN
# =============================================================================

class TokenResponse(BaseModel):
    """Respuesta del endpoint de autenticación OAuth2."""
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "Bearer"


class TokenRequest(BaseModel):
    """Request para obtener token OAuth2."""
    grant_type: str = "password"
    client_id: str
    client_secret: str
    username: str
    password: str


class RefreshTokenRequest(BaseModel):
    """Request para renovar token OAuth2."""
    grant_type: str = "refresh_token"
    client_id: str
    client_secret: str
    refresh_token: str


# =============================================================================
# MODELOS DE CLIENTE/ADQUIRIENTE
# =============================================================================

class CustomerSchema(BaseModel):
    """
    Datos del cliente/adquiriente para la factura.
    Cumple con los requerimientos de la DIAN.
    """
    model_config = ConfigDict(str_strip_whitespace=True)
    
    # Tipo de documento del cliente
    # 1=Registro civil, 2=Tarjeta identidad, 3=Cédula, 4=Tarjeta extranjería, 
    # 5=Cédula extranjería, 6=NIT, 7=Pasaporte, otros...
    identification_document_id: int = Field(
        default=3,  # Cédula de ciudadanía por defecto
        ge=1,
        description="Tipo de documento de identificación"
    )
    
    identification_number: str = Field(
        ...,
        min_length=1,
        max_length=20,
        description="Número de identificación (solo números para NIT)"
    )
    
    # Dígito de verificación (solo para NIT)
    dv: Optional[str] = Field(
        default=None,
        max_length=1,
        description="Dígito de verificación (solo para NIT)"
    )
    
    # Datos del adquiriente
    # 1=Persona Jurídica, 2=Persona Natural
    entity_type_id: int = Field(
        default=2,
        ge=1,
        le=2,
        description="1=Persona Jurídica, 2=Persona Natural"
    )
    
    company: Optional[str] = Field(
        default=None,
        max_length=450,
        description="Razón social (solo para persona jurídica)"
    )
    
    first_name: Optional[str] = Field(
        default=None,
        max_length=150,
        description="Nombres (solo para persona natural)"
    )
    
    last_name: Optional[str] = Field(
        default=None,
        max_length=150,
        description="Apellidos (solo para persona natural)"
    )
    
    email: EmailStr = Field(
        ...,
        description="Correo electrónico del cliente"
    )
    
    phone: Optional[str] = Field(
        default=None,
        max_length=20,
        description="Teléfono del cliente"
    )
    
    address: str = Field(
        default="Sin dirección registrada",
        max_length=500,
        description="Dirección del cliente"
    )
    
    # Código del municipio según DANE
    municipality_id: int = Field(
        default=149,  # Bogotá por defecto
        description="ID del municipio según catálogo Factus"
    )
    
    # Régimen tributario
    # 1=Responsable de IVA, 2=No responsable de IVA
    liability_id: int = Field(
        default=2,
        ge=1,
        description="Responsabilidad tributaria"
    )
    
    @field_validator('identification_number')
    @classmethod
    def validate_identification(cls, v: str) -> str:
        """Valida y sanitiza el número de identificación."""
        cleaned = sanitize_numeric_string(v)
        if not cleaned:
            raise ValueError("El número de identificación debe contener dígitos")
        return cleaned
    
    @field_validator('first_name', 'last_name', 'company', 'address')
    @classmethod
    def sanitize_text_fields(cls, v: Optional[str]) -> Optional[str]:
        """Sanitiza campos de texto."""
        if v is None:
            return v
        return sanitize_text(v)
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        """Limpia el teléfono de caracteres no válidos."""
        if v is None:
            return v
        # Permitir solo números, espacios, guiones y +
        return re.sub(r'[^\d\s\-\+]', '', v)


# =============================================================================
# MODELOS DE IMPUESTOS
# =============================================================================

class TaxSchema(BaseModel):
    """
    Impuesto aplicado a un ítem de la factura.
    Soporta IVA (tax_id=1) e Impoconsumo (tax_id=22).
    """
    model_config = ConfigDict(coerce_numbers_to_str=False)
    
    # Códigos de impuestos DIAN:
    # 1=IVA, 22=Impoconsumo (IC), otros según catálogo
    tax_id: int = Field(
        ...,
        ge=1,
        description="ID del tributo según catálogo Factus (1=IVA, 22=Impoconsumo)"
    )
    
    tax_amount: Decimal = Field(
        ...,
        ge=0,
        description="Valor del impuesto calculado"
    )
    
    taxable_amount: Decimal = Field(
        ...,
        ge=0,
        description="Base gravable sobre la que se calcula el impuesto"
    )
    
    percent: Decimal = Field(
        ...,
        ge=0,
        le=100,
        description="Porcentaje del impuesto"
    )


class WithholdingTaxSchema(BaseModel):
    """Retención aplicada a la factura (opcional)."""
    
    withholding_tax_id: int = Field(
        ...,
        description="ID del tipo de retención"
    )
    
    tax_amount: Decimal = Field(
        ...,
        ge=0,
        description="Valor de la retención"
    )
    
    taxable_amount: Decimal = Field(
        ...,
        ge=0,
        description="Base para la retención"
    )
    
    percent: Decimal = Field(
        ...,
        ge=0,
        le=100,
        description="Porcentaje de retención"
    )


# =============================================================================
# MODELOS DE ÍTEMS DE FACTURA
# =============================================================================

class InvoiceItemSchema(BaseModel):
    """Ítem/producto de la factura electrónica."""
    model_config = ConfigDict(str_strip_whitespace=True)
    
    code: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Código interno del producto"
    )
    
    description: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Descripción del producto/servicio"
    )
    
    quantity: Decimal = Field(
        ...,
        gt=0,
        description="Cantidad del producto"
    )
    
    price: Decimal = Field(
        ...,
        ge=0,
        description="Precio unitario sin impuestos"
    )
    
    discount: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        description="Descuento aplicado al ítem"
    )
    
    # Unidades de medida según estándar UN/ECE
    # 70=Unidad, 94=Porción, otros según catálogo
    unit_measure_id: int = Field(
        default=70,
        description="ID de unidad de medida (70=Unidad estándar)"
    )
    
    # Impuestos aplicados al ítem
    taxes: List[TaxSchema] = Field(
        default_factory=list,
        description="Lista de impuestos aplicados al ítem"
    )
    
    # Retenciones (opcional)
    withholding_taxes: List[WithholdingTaxSchema] = Field(
        default_factory=list,
        description="Lista de retenciones aplicadas al ítem"
    )
    
    @field_validator('description', 'code')
    @classmethod
    def sanitize_item_text(cls, v: str) -> str:
        """Sanitiza texto del ítem."""
        return sanitize_text(v)
    
    @property
    def subtotal(self) -> Decimal:
        """Calcula el subtotal del ítem (cantidad * precio - descuento)."""
        return (self.quantity * self.price) - self.discount
    
    @property
    def total_taxes(self) -> Decimal:
        """Suma total de impuestos del ítem."""
        return sum(tax.tax_amount for tax in self.taxes)


# =============================================================================
# MODELOS DE FACTURA
# =============================================================================

class InvoiceCreateSchema(BaseModel):
    """
    Esquema para crear una factura electrónica en Factus.
    Mapea los datos de una orden de restaurante al formato requerido.
    """
    model_config = ConfigDict(str_strip_whitespace=True)
    
    # ID del rango de numeración autorizado por la DIAN
    numbering_range_id: int = Field(
        ...,
        gt=0,
        description="ID del rango de numeración (resolución DIAN)"
    )
    
    # Código de referencia interno (ID de la orden)
    reference_code: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Código de referencia interno (ID orden/venta)"
    )
    
    # Observaciones adicionales
    observation: Optional[str] = Field(
        default=None,
        max_length=5000,
        description="Observaciones generales de la factura"
    )
    
    # Forma de pago
    # 1=Contado, 2=Crédito
    payment_form: int = Field(
        default=1,
        ge=1,
        le=2,
        description="Forma de pago (1=Contado, 2=Crédito)"
    )
    
    # Método de pago (códigos DIAN)
    # 10=Efectivo, 47=Transferencia, 48=Tarjeta crédito, 49=Tarjeta débito
    payment_method: int = Field(
        default=10,
        description="Método de pago según códigos DIAN"
    )
    
    # Fecha de vencimiento (solo para crédito)
    due_date: Optional[date] = Field(
        default=None,
        description="Fecha de vencimiento (requerido si payment_form=2)"
    )
    
    # Datos del cliente
    customer: CustomerSchema = Field(
        ...,
        description="Información del cliente/adquiriente"
    )
    
    # Ítems de la factura
    items: List[InvoiceItemSchema] = Field(
        ...,
        min_length=1,
        description="Lista de productos/servicios facturados"
    )
    
    # Enviar correo al cliente
    send_email: bool = Field(
        default=True,
        description="Enviar la factura por correo al cliente"
    )
    
    @field_validator('reference_code', 'observation')
    @classmethod
    def sanitize_invoice_text(cls, v: Optional[str]) -> Optional[str]:
        """Sanitiza campos de texto de la factura."""
        if v is None:
            return v
        return sanitize_text(v)
    
    @property
    def subtotal(self) -> Decimal:
        """Suma de subtotales de todos los ítems."""
        return sum(item.subtotal for item in self.items)
    
    @property
    def total_taxes(self) -> Decimal:
        """Suma total de impuestos."""
        return sum(item.total_taxes for item in self.items)
    
    @property
    def total(self) -> Decimal:
        """Total de la factura (subtotal + impuestos)."""
        return self.subtotal + self.total_taxes
    
    def to_factus_payload(self) -> dict:
        """
        Convierte el esquema al formato JSON que espera la API de Factus.
        """
        # Construir datos del cliente según tipo de persona
        customer_data = {
            "identification_document_id": self.customer.identification_document_id,
            "identification": self.customer.identification_number,
            "legal_organization_id": self.customer.entity_type_id,
            # "tribute_id": self.customer.liability_id, # Eliminado por error de validación
            "email": self.customer.email,
            "address": self.customer.address,
            "municipality_id": self.customer.municipality_id,
        }
        
        if self.customer.dv:
            customer_data["dv"] = self.customer.dv
            
        if self.customer.phone:
            customer_data["phone"] = self.customer.phone
        
        # Persona jurídica usa 'company', persona natural usa 'names'
        if self.customer.entity_type_id == 1:
            customer_data["company"] = self.customer.company
        else:
            names = []
            if self.customer.first_name:
                names.append(self.customer.first_name)
            if self.customer.last_name:
                names.append(self.customer.last_name)
            customer_data["names"] = " ".join(names) if names else "Consumidor Final"
        
        # Construir ítems
        items_data = []
        for item in self.items:
            # Obtener datos del primer impuesto para campos planos obligatorios
            first_tax = item.taxes[0] if item.taxes else None
            tax_id = first_tax.tax_id if first_tax else 1 # Default 1 (IVA)
            tax_rate = float(first_tax.percent) if first_tax else 0.0
            
            # Calcular discount_rate
            discount_rate = 0.0
            if float(item.price) > 0:
                discount_rate = (float(item.discount) / float(item.price)) * 100
            
            item_data = {
                "code_reference": item.code,
                "name": item.description,
                "quantity": float(item.quantity),
                "price": float(item.price),
                "discount": float(item.discount),
                "discount_rate": discount_rate,
                "unit_measure_id": item.unit_measure_id,
                "standard_code_id": 1,
                "is_excluded": 0,
                "tribute_id": tax_id,       # ID dinámico según el impuesto (1=IVA, 22=Impoconsumo)
                "tax_rate": tax_rate,
                "taxes": [
                    {
                        "tax_id": tax.tax_id,
                        "tax_amount": float(tax.tax_amount),
                        "taxable_amount": float(tax.taxable_amount),
                        "percent": float(tax.percent)
                    }
                    for tax in item.taxes
                ],
                "withholding_taxes": [
                    {
                        "withholding_tax_id": wt.withholding_tax_id,
                        "tax_amount": float(wt.tax_amount),
                        "taxable_amount": float(wt.taxable_amount),
                        "percent": float(wt.percent)
                    }
                    for wt in item.withholding_taxes
                ]
            }
            items_data.append(item_data)
        
        # Payload final
        payload = {
            "numbering_range_id": self.numbering_range_id,
            "reference_code": self.reference_code,
            "payment_form": self.payment_form,
            "payment_method": self.payment_method,
            "customer": customer_data,
            "items": items_data,
            "send_email": self.send_email,
        }
        
        if self.observation:
            payload["observation"] = self.observation
            
        if self.due_date:
            payload["due_date"] = self.due_date.isoformat()
        
        return payload


# =============================================================================
# MODELOS DE RESPUESTA
# =============================================================================

class InvoiceResponseSchema(BaseModel):
    """Respuesta al crear una factura en Factus."""
    
    id: int = Field(..., description="ID de la factura en Factus")
    number: str = Field(..., description="Número de la factura")
    prefix: Optional[str] = Field(default=None, description="Prefijo de la numeración")
    cufe: str = Field(..., description="Código Único de Factura Electrónica")
    status: str = Field(..., description="Estado de la factura")
    created_at: Optional[datetime] = Field(default=None, description="Fecha de creación")
    validated_at: Optional[datetime] = Field(default=None, description="Fecha de validación DIAN")
    pdf_url: Optional[str] = Field(default=None, description="URL del PDF de la factura")
    xml_url: Optional[str] = Field(default=None, description="URL del XML de la factura")
    qr_code: Optional[str] = Field(default=None, description="Código QR en base64")


class NumberingRangeSchema(BaseModel):
    """Rango de numeración autorizado por la DIAN."""
    
    id: int
    prefix: Optional[str] = None
    from_number: int = Field(alias="from")
    to_number: int = Field(alias="to")
    current: int
    resolution_number: str
    resolution_date: Optional[date] = None
    technical_key: Optional[str] = None
    is_expired: bool = False
    
    model_config = ConfigDict(populate_by_name=True)


class MunicipalitySchema(BaseModel):
    """Municipio según catálogo de la DIAN."""
    
    id: int
    name: str
    code: str
    department: Optional[str] = None


class TributeSchema(BaseModel):
    """Tributo/impuesto según catálogo de la DIAN."""
    
    id: int
    name: str
    code: str
    description: Optional[str] = None


class FactusAPIResponse(BaseModel):
    """Respuesta genérica de la API de Factus."""
    
    status: str
    message: Optional[str] = None
    data: Optional[Any] = None
    errors: Optional[List[str]] = None


# =============================================================================
# MODELOS DE NOTA CRÉDITO
# =============================================================================

class CreditNoteCreate(BaseModel):
    """
    Schema para crear una Nota Crédito (Anulación).
    """
    invoice_number: str = Field(..., description="Número de la factura a anular")
    reason_code: str = Field(default="2", description="Código de discrepancia DIAN (2=Anulación por error)")
    description: str = Field(..., min_length=5, max_length=500, description="Motivo de la anulación")
