# backend/fix_admin.py
from sqlmodel import Session, select
from app.core.db import engine
from app.models import User

def arreglar_admin():
    print("🚑 Iniciando reparación del usuario Admin...")
    
    with Session(engine) as session:
        # 1. Buscar al usuario por email
        statement = select(User).where(User.email == "admin@example.com")
        user = session.exec(statement).first()
        
        if not user:
            print("❌ Error: No se encontró el usuario 'admin@example.com'.")
            print("   -> Asegúrate de haber ejecutado 'python inicializar_db.py' primero.")
            return

        # 2. Corregir sus datos
        print(f"   Usuario encontrado. Rol actual: {user.rol}")
        
        user.rol = "admin"            # Forzar rol Admin
        user.is_superuser = True      # Forzar Superusuario
        user.full_name = "Administrador Principal" # Quitar el 'null' feo
        
        session.add(user)
        session.commit()
        session.refresh(user)
        
        print("✅ ¡REPARADO! Datos actuales:")
        print(f"   - Nombre: {user.full_name}")
        print(f"   - Rol: {user.rol}")
        print(f"   - Superuser: {user.is_superuser}")
        print("👉 Ahora intenta iniciar sesión de nuevo.")

if __name__ == "__main__":
    arreglar_admin()