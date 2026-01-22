import sys
import os

# Adjust path to include backend root
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from src.infrastructure.database.connection import get_db_connection

def list_terceros():
    print("🚀 Listando Terceros 'Master'...")
    conn_gen = get_db_connection()
    conn = next(conn_gen)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT terceroid, tercero FROM terceros WHERE tercero ILIKE '%Master%' ORDER BY tercero")
        rows = cursor.fetchall()
        for r in rows:
            print(f"ID: {r[0]} - Nombre: '{r[1]}'")
    finally:
        pass

if __name__ == "__main__":
    list_terceros()
