import sys
import os

# Adjust path to include backend root
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from src.infrastructure.database.connection import get_db_connection

def check_cuentas():
    print("Checking Cuentas schema...")
    conn_gen = get_db_connection()
    conn = next(conn_gen)
    cursor = conn.cursor()
    
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='cuentas';")
    print(f"Cuentas cols: {[r[0] for r in cursor.fetchall()]}")

if __name__ == "__main__":
    check_cuentas()
