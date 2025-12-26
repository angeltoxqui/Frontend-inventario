import sqlite3

DB_NAME = "gastro_pro.db"

def update_schema_v2():
    print(f"🔧 Conectando a {DB_NAME}...")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # 1. Agregar 'stock_maximo' a INSUMO (Para calcular el 10%)
    try:
        print("--- Agregando 'stock_maximo' a INSUMO ---")
        cursor.execute("ALTER TABLE insumo ADD COLUMN stock_maximo FLOAT DEFAULT 1000.0")
        print("✅ Columna 'stock_maximo' agregada.")
    except sqlite3.OperationalError:
        print("ℹ️ La columna 'stock_maximo' ya existe.")

    # 2. Agregar 'receta_snapshot' a DETALLEVENTA (Para que Cocina vea la receta exacta)
    try:
        print("--- Agregando 'receta_snapshot' a DETALLEVENTA ---")
        cursor.execute("ALTER TABLE detalleventa ADD COLUMN receta_snapshot TEXT")
        print("✅ Columna 'receta_snapshot' agregada.")
    except sqlite3.OperationalError:
        print("ℹ️ La columna 'receta_snapshot' ya existe.")

    conn.commit()
    conn.close()
    print("\n🚀 ¡Base de datos actualizada a V2!")

if __name__ == "__main__":
    update_schema_v2()