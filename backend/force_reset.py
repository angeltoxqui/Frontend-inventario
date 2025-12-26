import sys
import os

# 1. Aseguramos que Python encuentre la carpeta 'app'
sys.path.append(os.getcwd())

from sqlmodel import Session, select
# Intentamos importar el 'engine' desde la ubicación estándar de SQLModel
try:
    from app.core.db import engine
except ImportError:
    # Si falla, intentamos la ubicación antigua
    from app.db import engine

from app.models import User
from app.core.security import get_password_hash

def reset_admin_password():
    # Usamos el engine para abrir una sesión
    with Session(engine) as session:
        email_objetivo = "admin@example.com"
        nueva_pass = "12345678"
        
        print(f"🔍 Buscando usuario {email_objetivo}...")
        
        # Consulta estilo SQLModel
        statement = select(User).where(User.email == email_objetivo)
        user = session.exec(statement).first()
        
        if user:
            print(f"✅ Usuario encontrado (ID: {user.id})")
            
            # Sobrescribir la contraseña
            user.hashed_password = get_password_hash(nueva_pass)
            
            session.add(user)
            session.commit()
            session.refresh(user)
            
            print("------------------------------------------------")
            print(f"🚀 CONTRASEÑA RESTABLECIDA CON ÉXITO")
            print(f"📧 Usuario: {email_objetivo}")
            print(f"🔑 Nueva contraseña: {nueva_pass}")
            print("------------------------------------------------")
        else:
            print(f"❌ Error: No se encontró el usuario {email_objetivo}.")

if __name__ == "__main__":
    reset_admin_password()