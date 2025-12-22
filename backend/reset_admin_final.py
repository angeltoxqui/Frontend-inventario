from sqlmodel import Session, select, create_engine
from app.models import User
from app.core.security import get_password_hash # Usamos el encriptador oficial de tu app

# Conexión directa a tu base de datos
DATABASE_URL = "sqlite:///./gastro_pro.db"
engine = create_engine(DATABASE_URL)

def reiniciar_admin():
    print("🚑 INICIANDO REPARACIÓN DE CUENTAS...")
    
    with Session(engine) as session:
        # 1. Buscar si existe el admin (por email)
        email_objetivo = "admin@example.com"
        usuario = session.exec(select(User).where(User.email == email_objetivo)).first()
        
        # 2. Si existe, lo borramos para crearlo limpio
        if usuario:
            print(f"⚠️  Usuario '{email_objetivo}' encontrado. Eliminando para recrear...")
            session.delete(usuario)
            session.commit()
        
        # 3. Crear el Admin Nuevo con contraseña ENCRIPTADA
        # Esto es clave: get_password_hash convierte "12345678" en "$2b$12$..."
        print("🔑 Generando nueva contraseña encriptada...")
        password_segura = get_password_hash("12345678") 
        
        nuevo_admin = User(
            email=email_objetivo,
            hashed_password=password_segura,
            full_name="Super Administrador",
            rol="admin",          # Rol exacto
            is_active=True,
            is_superuser=True
        )
        
        session.add(nuevo_admin)
        session.commit()
        session.refresh(nuevo_admin)
        
        print("\n✅ ¡ÉXITO! Usuario Administrador Restaurado.")
        print("============================================")
        print(f"📧 USUARIO:  {email_objetivo}")
        print(f"🔑 PASSWORD: 12345678")
        print(f"🛡️  ROL:      {nuevo_admin.rol}")
        print("============================================")
        print("👉 Ve al Login e intenta entrar con estos datos exactos.")

if __name__ == "__main__":
    reiniciar_admin()