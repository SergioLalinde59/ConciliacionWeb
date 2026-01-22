import sys
import os
import psycopg2

# Adjust path to include backend root
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from src.infrastructure.database.connection import get_db_connection

def add_cuenta_id_column():
    print("🚀 Iniciando migración de tabla 'reglas_clasificacion'...")
    
    conn_gen = get_db_connection()
    conn = next(conn_gen)
    
    try:
        cursor = conn.cursor()
        
        # Check if column exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='reglas_clasificacion' AND column_name='cuenta_id';
        """)
        if cursor.fetchone():
            print("⚠️ La columna 'cuenta_id' ya existe. No se realizaron cambios.")
        else:
            print("✨ Agregando columna 'cuenta_id'...")
            # Add column
            cursor.execute("""
                ALTER TABLE reglas_clasificacion 
                ADD COLUMN cuenta_id INTEGER REFERENCES cuentas(id);
            """)
            
            # Add index
            print("indexando...")
            cursor.execute("CREATE INDEX idx_reglas_cuenta ON reglas_clasificacion(cuenta_id);")
            
            conn.commit()
            print("✅ Migración completada exitosamente.")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")
    finally:
        cursor.close()
        # conn.close() # Connection handling depends on pool implementation

if __name__ == "__main__":
    add_cuenta_id_column()
