"""
Excepciones personalizadas para la integración con Factus.
Proporciona manejo de errores claro y consistente.
"""

from typing import Optional, Any


class FactusBaseException(Exception):
    """Excepción base para todos los errores de Factus."""
    
    def __init__(
        self, 
        message: str, 
        status_code: Optional[int] = None,
        details: Optional[Any] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)
    
    def __str__(self) -> str:
        base = f"[Factus Error] {self.message}"
        if self.status_code:
            base = f"[{self.status_code}] {base}"
        if self.details:
            base = f"{base} | Details: {self.details}"
        return base


class FactusAuthError(FactusBaseException):
    """Error de autenticación con Factus (credenciales inválidas, token expirado)."""
    
    def __init__(
        self, 
        message: str = "Error de autenticación con Factus",
        status_code: Optional[int] = 401,
        details: Optional[Any] = None
    ):
        super().__init__(message, status_code, details)


class FactusTokenExpiredError(FactusAuthError):
    """El token ha expirado y no se pudo renovar."""
    
    def __init__(
        self, 
        message: str = "El token de acceso ha expirado",
        details: Optional[Any] = None
    ):
        super().__init__(message, 401, details)


class FactusAPIError(FactusBaseException):
    """Error general de la API de Factus (respuestas 4xx/5xx)."""
    
    def __init__(
        self, 
        message: str = "Error en la API de Factus",
        status_code: Optional[int] = 500,
        details: Optional[Any] = None,
        endpoint: Optional[str] = None
    ):
        self.endpoint = endpoint
        super().__init__(message, status_code, details)
    
    def __str__(self) -> str:
        base = super().__str__()
        if self.endpoint:
            base = f"{base} (Endpoint: {self.endpoint})"
        return base


class FactusValidationError(FactusBaseException):
    """Error de validación de datos antes de enviar a Factus."""
    
    def __init__(
        self, 
        message: str = "Error de validación de datos",
        field: Optional[str] = None,
        details: Optional[Any] = None
    ):
        self.field = field
        super().__init__(message, 422, details)
    
    def __str__(self) -> str:
        base = super().__str__()
        if self.field:
            base = f"{base} (Campo: {self.field})"
        return base


class FactusConnectionError(FactusBaseException):
    """Error de conexión con la API de Factus (timeout, red)."""
    
    def __init__(
        self, 
        message: str = "No se pudo conectar con Factus",
        details: Optional[Any] = None
    ):
        super().__init__(message, 503, details)


class FactusInvoiceError(FactusBaseException):
    """Error específico al crear o validar una factura."""
    
    def __init__(
        self, 
        message: str = "Error al procesar la factura",
        invoice_reference: Optional[str] = None,
        status_code: Optional[int] = 400,
        details: Optional[Any] = None
    ):
        self.invoice_reference = invoice_reference
        super().__init__(message, status_code, details)
