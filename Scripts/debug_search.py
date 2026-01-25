
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'Backend'))
from src.infrastructure.database.connection import get_db_connection
from src.infrastructure.database.postgres_movimiento_repository import PostgresMovimientoRepository

def debug_search():
    gen = get_db_connection()
    conn = next(gen)
    try:
        repo = PostgresMovimientoRepository(conn)
        print("Running buscar_avanzado...")
        repo.buscar_avanzado(descripcion_contiene="Test")
        print("Success")
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        try:
            next(gen)
        except StopIteration:
            pass

if __name__ == "__main__":
    debug_search()
