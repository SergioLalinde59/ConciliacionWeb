import os
import sys
# Add Backend to path to allow importing src
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'Backend'))

from src.infrastructure.database.connection import get_db_connection

def migrate_config_values():
    conn = None
    try:
        # Use the generator to get the connection
        gen = get_db_connection()
        conn = next(gen)
        
        cursor = conn.cursor()
        
        print("Migrating config_valores_pendientes types from 'grupo' to 'centro_costo'...")
        
        cursor.execute("""
            UPDATE config_valores_pendientes
            SET tipo = 'centro_costo'
            WHERE tipo = 'grupo';
        """)
        
        updated_rows = cursor.rowcount
        conn.commit()
        print(f"Migration completed. Updated {updated_rows} rows.")
        
        cursor.close()
        
    except Exception as e:
        print(f"Error during migration: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    migrate_config_values()
