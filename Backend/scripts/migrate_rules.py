import sys
import os
import time

# Adjust path to include backend root
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from src.infrastructure.database.connection import get_db_connection

def migrate_rules():
    print("Iniciando migracion matching_alias -> reglas_clasificacion...")
    conn_gen = get_db_connection()
    conn = next(conn_gen)
    cursor = conn.cursor()
    
    try:
        # Check matching_alias content
        # Asumiendo esquema basado en lo que encuentre
        cursor.execute("SELECT * FROM matching_alias")
        rows = cursor.fetchall()
        
        # Get column names
        col_names = [desc[0] for desc in cursor.description]
        print(f"Columns: {col_names}")
        
        migrated_count = 0
        for row in rows:
            data = dict(zip(col_names, row))
            print(f"Migrating: {data}")
            
            # Mapping logic (Adaptar segun columnas reales)
            # Ejemplo hipotesis: alias -> patron, tercero_id -> tercero_id, etc.
            
            patron = data.get('alias') or data.get('patron')
            tercero_id = data.get('tercero_id')
            centro_costo_id = data.get('centro_costo_id') or data.get('grupo_id')
            concepto_id = data.get('concepto_id')
            cuenta_id = data.get('cuenta_id')
            
            if patron:
                # Insert if not exists
                cursor.execute("""
                    INSERT INTO reglas_clasificacion (patron, cuenta_id, tercero_id, centro_costo_id, concepto_id, tipo_match)
                    SELECT %s, %s, %s, %s, %s, 'contiene'
                    WHERE NOT EXISTS (SELECT 1 FROM reglas_clasificacion WHERE patron = %s)
                """, (patron, cuenta_id, tercero_id, centro_costo_id, concepto_id, patron))
                migrated_count += 1
                
        conn.commit()
        print(f"Migracion completada. {migrated_count} reglas migradas.")
            
    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
    finally:
        cursor.close()

if __name__ == "__main__":
    migrate_rules()
