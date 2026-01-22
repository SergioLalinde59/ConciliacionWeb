import sys
import os

# Adjust path to include backend root
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from src.infrastructure.database.connection import get_db_connection
from src.infrastructure.database.postgres_reglas_repository import PostgresReglasRepository

def test_repo():
    print("Testing ReglasRepository...")
    conn_gen = get_db_connection()
    conn = next(conn_gen)
    
    repo = PostgresReglasRepository(conn)
    try:
        reglas = repo.obtener_todos()
        print(f"Success! Got {len(reglas)} rules.")
        for r in reglas[:3]:
            print(r)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_repo()
