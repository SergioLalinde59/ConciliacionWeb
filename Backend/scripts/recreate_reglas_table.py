import sys
import os
import psycopg2

# Adjust path to include backend root
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from src.infrastructure.database.connection import get_db_connection

def recreate_reglas_table():
    print("🚀 Recreando tabla 'reglas_clasificacion'...")
    
    conn_gen = get_db_connection()
    conn = next(conn_gen)
    
    try:
        cursor = conn.cursor()
        
        # 1. Truncate / Drop
        print("🗑️  Truncando y eliminando tabla anterior...")
        cursor.execute("DROP TABLE IF EXISTS reglas_clasificacion CASCADE;")
        
        # 2. Create Table
        print("✨ Creando nueva tabla con campo 'descripcion' y 'centro_costo_id'...")
        create_sql = """
        CREATE TABLE reglas_clasificacion (
            id SERIAL PRIMARY KEY,
            patron VARCHAR(255) NOT NULL,
            descripcion VARCHAR(100),
            tercero_id INTEGER REFERENCES terceros(terceroid),
            centro_costo_id INTEGER REFERENCES centro_costos(centro_costo_id),
            concepto_id INTEGER REFERENCES conceptos(conceptoid),
            tipo_match VARCHAR(20) DEFAULT 'contiene'
        );
        """
        cursor.execute(create_sql)
        
        # 3. Create Indexes
        print("indexando...")
        cursor.execute("CREATE INDEX idx_reglas_patron ON reglas_clasificacion(patron);")
        cursor.execute("CREATE INDEX idx_reglas_tercero ON reglas_clasificacion(tercero_id);")
        # Optional: Index on centro_costo/concepto if we filter by them often, generally good practice for FKs
        cursor.execute("CREATE INDEX idx_reglas_centro_costo ON reglas_clasificacion(centro_costo_id);")
        
        conn.commit()
        print("✅ Tabla recreada exitosamente.")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")
    finally:
        cursor.close()
        # Return connection to pool (handled by context manager usually but here manual)
        pass

if __name__ == "__main__":
    recreate_reglas_table()
