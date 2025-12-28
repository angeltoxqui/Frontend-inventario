import sqlite3

DB_NAME = "gastro_pro.db"

def update_schema_v3():
    print(f"🔧 Conectando a {DB_NAME}...")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # 1. Agregar 'categoria' a PRODUCTO
    try:
        print("--- Agregando 'categoria' a PRODUCTO ---")
        cursor.execute("ALTER TABLE producto ADD COLUMN categoria TEXT DEFAULT 'General'")
        print("✅ Columna 'categoria' agregada.")
    except sqlite3.OperationalError:
        print("ℹ️ La columna 'categoria' ya existe.")

    # 2. Agregar 'en_turno' a USER (Control de asistencia)
    try:
        print("--- Agregando 'en_turno' a USER ---")
        cursor.execute("ALTER TABLE user ADD COLUMN en_turno BOOLEAN DEFAULT 1")
        print("✅ Columna 'en_turno' agregada.")
    except sqlite3.OperationalError:
        print("ℹ️ La columna 'en_turno' ya existe.")

    conn.commit()
    conn.close()
    print("\n🚀 ¡Base de datos actualizada a V3!")

if __name__ == "__main__":
    update_schema_v3()