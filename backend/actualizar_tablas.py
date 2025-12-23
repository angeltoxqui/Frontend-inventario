import sqlite3

DB_NAME = "gastro_pro.db"

def update_schema():
    print(f"Conectando a {DB_NAME}...")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Agregamos la columna 'comensal' a la tabla detalleventa
    try:
        print("--- Agregando columna 'comensal' a detalleventa ---")
        cursor.execute("ALTER TABLE detalleventa ADD COLUMN comensal TEXT DEFAULT 'Mesa'")
        print("✅ Columna 'comensal' agregada.")
    except sqlite3.OperationalError as e:
        print(f"ℹ️ {e}")

    conn.commit()
    conn.close()
    print("\n¡Listo! Base de datos actualizada.")

if __name__ == "__main__":
    update_schema()