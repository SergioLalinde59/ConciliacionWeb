
import sys
import os
sys.path.append(os.getcwd())

import psycopg2
from src.infrastructure.database.connection import DB_CONFIG

def create_table_filters():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Create table if not exists
        print("Creating table config_filtros_grupos...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS config_filtros_centro_costos (
                id SERIAL PRIMARY KEY,
                centro_costo_id INTEGER NOT NULL UNIQUE,
                etiqueta VARCHAR(100) NOT NULL,
                activo_por_defecto BOOLEAN DEFAULT TRUE,
                CONSTRAINT fk_centro_costo FOREIGN KEY (centro_costo_id) REFERENCES centro_costos(centro_costo_id)
            );
        """)
        
        # Insert initial data
        filters = [
            (35, 'Excluir Préstamos', True),
            (46, 'Excluir Tita', True),
            (47, 'Excluir Traslados', True)
        ]
        
        print("Inserting/Updating initial filters...")
        for gid, label, default_active in filters:
            cur.execute("""
                INSERT INTO config_filtros_centro_costos (centro_costo_id, etiqueta, activo_por_defecto)
                VALUES (%s, %s, %s)
                ON CONFLICT (centro_costo_id) DO UPDATE 
                SET etiqueta = EXCLUDED.etiqueta,
                    activo_por_defecto = EXCLUDED.activo_por_defecto;
            """, (gid, label, default_active))
            
        conn.commit()
        print("Done.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_table_filters()
