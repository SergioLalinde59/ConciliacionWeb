import sys
import os
import psycopg2

# Adjust path to include backend root
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from src.infrastructure.database.connection import get_db_connection

def check_minimal():
    conn_gen = get_db_connection()
    conn = next(conn_gen)
    cursor = conn.cursor()
    
    try:
        # Schema of matching_alias
        cursor.execute("SELECT column_name, data_type, ordinal_position FROM information_schema.columns WHERE table_name = 'matching_alias' ORDER BY ordinal_position;")
        cols = cursor.fetchall()
        print(f"MATCHING_ALIAS COLS: {cols}")
        
        # Counts
        for table in ['matching_alias', 'terceros', 'centro_costos', 'conceptos', 'cuentas']:
            cursor.execute(f"SELECT count(*) FROM {table};")
            print(f"COUNT {table}: {cursor.fetchone()[0]}")
            
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        cursor.close()

if __name__ == "__main__":
    check_minimal()
