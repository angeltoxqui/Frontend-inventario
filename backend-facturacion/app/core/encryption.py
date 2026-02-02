"""
Módulo de encriptación para credenciales sensibles.
Usa Fernet (AES-128-CBC) para encriptación reversible.
"""

import base64
import os
import logging
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)


class CredentialEncryptor:
    """
    Encriptador de credenciales usando Fernet (AES simétrico).
    
    Características:
    - Encriptación reversible (necesaria para usar las credenciales)
    - Clave derivada de ENCRYPTION_KEY del entorno
    - Seguro para almacenar en BD
    """
    
    def __init__(self, encryption_key: Optional[str] = None):
        """
        Inicializa el encriptador.
        
        Args:
            encryption_key: Clave base para encriptación.
                           Si no se proporciona, se lee de ENCRYPTION_KEY env var.
        """
        key = encryption_key or os.getenv("ENCRYPTION_KEY")
        
        if not key:
            # Generar una clave temporal para desarrollo
            logger.warning(
                "ENCRYPTION_KEY no configurada. Usando clave temporal. "
                "CONFIGURA UNA CLAVE SEGURA EN PRODUCCIÓN."
            )
            key = "dev-key-not-for-production-use-"
        
        # Derivar clave Fernet de 32 bytes
        self._fernet = self._create_fernet(key)
    
    def _create_fernet(self, key: str) -> Fernet:
        """
        Crea una instancia de Fernet con clave derivada.
        Usa PBKDF2 para derivar una clave de 32 bytes.
        """
        # Salt fijo para consistencia (en producción podría ser configurable)
        salt = b"gastro-pos-pro-salt-v1"
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        
        derived_key = base64.urlsafe_b64encode(
            kdf.derive(key.encode())
        )
        
        return Fernet(derived_key)
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encripta un texto plano.
        
        Args:
            plaintext: Texto a encriptar (ej: password)
            
        Returns:
            Texto encriptado en base64 (seguro para almacenar en BD)
        """
        if not plaintext:
            return ""
        
        encrypted_bytes = self._fernet.encrypt(plaintext.encode())
        return encrypted_bytes.decode()
    
    def decrypt(self, ciphertext: str) -> str:
        """
        Desencripta un texto cifrado.
        
        Args:
            ciphertext: Texto encriptado (obtenido de BD)
            
        Returns:
            Texto original en plano
            
        Raises:
            ValueError: Si el texto no puede ser desencriptado
        """
        if not ciphertext:
            return ""
        
        try:
            decrypted_bytes = self._fernet.decrypt(ciphertext.encode())
            return decrypted_bytes.decode()
        except InvalidToken:
            logger.error("Error al desencriptar: token inválido")
            raise ValueError("No se pudo desencriptar la credencial")
    
    def is_encrypted(self, value: str) -> bool:
        """
        Intenta determinar si un valor ya está encriptado.
        Los valores Fernet tienen un formato específico.
        """
        if not value:
            return False
        
        try:
            # Los tokens Fernet empiezan con 'gAAAAA'
            return value.startswith("gAAAAA") and len(value) > 50
        except Exception:
            return False


# Instancia global (singleton)
_encryptor: Optional[CredentialEncryptor] = None


def get_encryptor() -> CredentialEncryptor:
    """
    Obtiene la instancia global del encriptador.
    Patrón singleton para reutilizar la misma instancia.
    """
    global _encryptor
    if _encryptor is None:
        _encryptor = CredentialEncryptor()
    return _encryptor


def encrypt_credential(plaintext: str) -> str:
    """Función de conveniencia para encriptar."""
    return get_encryptor().encrypt(plaintext)


def decrypt_credential(ciphertext: str) -> str:
    """Función de conveniencia para desencriptar."""
    return get_encryptor().decrypt(ciphertext)
