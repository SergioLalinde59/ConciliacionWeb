import sys
import os
import psycopg2
from datetime import date

# Add src to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from src.infrastructure.database.postgres_movimiento_repository import PostgresMovimientoRepository

# Config for running INSIDE the docker container
DB_CONFIG = {
    'host': 'mvtos_db',
    'port': 5432,
    'user': 'postgres',
    'password': 'SLB',
    'database': 'Mvtos'
}

def main():
    try:
        print("Connecting to DB from INSIDE container...")
        conn = psycopg2.connect(**DB_CONFIG)
        print("Connected.")
        
        repo = PostgresMovimientoRepository(conn)
        
        start_date = date(2026, 1, 1)
        end_date = date(2026, 1, 31)
        
        # Test Conflict: Filter by Group 47 AND Exclude Group 47
        print(f"Testing Conflict: Filter Group=47 AND Exclude=[47]")
        
        movimientos, total = repo.buscar_avanzado(
            fecha_inicio=start_date,
            fecha_fin=end_date,
            grupo_id=47,
            grupos_excluidos=[47] # Should exclude EVERYTHING from group 47
        )
        
        print(f"RESULT: Total records found: {total}")
        
        if total == 0:
            print("SUCCESS: Logic is CORRECT (0 records found). Backend logic is fine.")
        else:
            print(f"FAILURE: Logic is BROKEN ({total} records found). Backend filtering failed.")
            for m in movimientos[:3]:
                print(f"  - Found ID: {m.id}, Group: {m.grupo_id}, Desc: {m.descripcion}")

    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()
