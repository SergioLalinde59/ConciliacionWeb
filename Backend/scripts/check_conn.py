import sys
import os

# Adjust path to include backend root
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from src.infrastructure.database.connection import get_db_connection

def check_conn():
    conn_gen = get_db_connection()
    conn = next(conn_gen)
    dsn = conn.dsn
    print(f"Connected to: {dsn}")
    
    cursor = conn.cursor()
    cursor.execute("SELECT current_database();")
    print(f"Database: {cursor.fetchone()[0]}")
    
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='reglas_clasificacion';")
    cols = [r[0] for r in cursor.fetchall()]
    print(f"Columns in reglas_clasificacion: {cols}")

if __name__ == "__main__":
    check_conn()
