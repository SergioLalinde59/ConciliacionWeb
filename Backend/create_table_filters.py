
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
            CREATE TABLE IF NOT EXISTS config_filtros_grupos (
                id SERIAL PRIMARY KEY,
                grupo_id INTEGER NOT NULL UNIQUE,
                etiqueta VARCHAR(100) NOT NULL,
                activo_por_defecto BOOLEAN DEFAULT TRUE,
                CONSTRAINT fk_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(grupoid)
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
                INSERT INTO config_filtros_grupos (grupo_id, etiqueta, activo_por_defecto)
                VALUES (%s, %s, %s)
                ON CONFLICT (grupo_id) DO UPDATE 
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
