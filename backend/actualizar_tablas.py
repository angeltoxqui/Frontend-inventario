import sqlite3

DB_NAME = "gastro_pro.db"

def update_schema():
    print(f"Conectando a {DB_NAME}...")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # 1. Agregar 'descuento_porcentaje' a la tabla VENTA (Para la caja)
    try:
        print("--- Verificando columna 'descuento_porcentaje' en tabla 'venta' ---")
        cursor.execute("ALTER TABLE venta ADD COLUMN descuento_porcentaje FLOAT DEFAULT 0.0")
        print("✅ Columna 'descuento_porcentaje' agregada.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("ℹ️ La columna 'descuento_porcentaje' ya existe.")
        else:
            print(f"❌ Error en venta: {e}")

    # 2. Agregar 'notas' a la tabla DETALLEVENTA (Para el mesero/cocina)
    try:
        print("--- Verificando columna 'notas' en tabla 'detalleventa' ---")
        cursor.execute("ALTER TABLE detalleventa ADD COLUMN notas TEXT")
        print("✅ Columna 'notas' agregada.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("ℹ️ La columna 'notas' ya existe.")
        else:
            print(f"❌ Error en detalleventa: {e}")

    # 3. Agregar 'comensal' por si acaso (Para split de cuentas)
    try:
        cursor.execute("ALTER TABLE detalleventa ADD COLUMN comensal TEXT DEFAULT 'Mesa'")
        print("✅ Columna 'comensal' agregada.")
    except sqlite3.OperationalError:
        print("ℹ️ La columna 'comensal' ya existía.")

    conn.commit()
    conn.close()
    print("\n¡Base de datos actualizada! Ya puedes iniciar el servidor.")

if __name__ == "__main__":
    update_schema()