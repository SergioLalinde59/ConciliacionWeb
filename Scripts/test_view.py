import sys
import os
import logging

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Backend')))

try:
    from src.infrastructure.database.connection import get_connection_pool
except ImportError as e:
    print(f"Error: {e}")
    sys.exit(1)

def run():
    print("Testing 'movimientos' view...")
    pool = get_connection_pool()
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            # Try to select columns used in the failing query
            cur.execute("SELECT id, descripcion, valor, fecha FROM movimientos LIMIT 1")
            row = cur.fetchone()
            print(f"Success! Row retrieved: {row}")
    except Exception as e:
        print(f"FAIL: {e}")
    finally:
        pool.putconn(conn)

if __name__ == "__main__":
    run()
