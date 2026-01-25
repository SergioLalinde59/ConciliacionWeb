import sys
import os
import logging

# Add Backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Backend')))

try:
    from src.infrastructure.database.connection import get_connection_pool
except ImportError as e:
    print(f"Error importing connection: {e}")
    sys.exit(1)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run():
    print("Initializing connection...")
    try:
        pool = get_connection_pool()
        conn = pool.getconn()
    except Exception as e:
        print(f"Failed to connect to DB: {e}")
        return

    try:
        with conn.cursor() as cur:
            sql_path = os.path.join(os.path.dirname(__file__), '..', 'Sql', 'CreateView_movimientos.sql')
            print(f"Reading SQL from {sql_path}...")
            with open(sql_path, 'r', encoding='utf-8') as f:
                sql = f.read()
                
            print("Executing SQL...")
            cur.execute(sql)
            conn.commit()
            print("View 'movimientos' created/updated successfully.")
    except Exception as e:
        conn.rollback()
        print(f"Error executing SQL: {e}")
    finally:
        pool.putconn(conn)
        print("Done.")

if __name__ == "__main__":
    run()
