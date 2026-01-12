import sys
import os
import psycopg2

# Add src to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from src.infrastructure.database.postgres_concepto_repository import PostgresConceptoRepository
from src.domain.models.concepto import Concepto

# DB Config
DB_CONFIG = {
    'host': 'localhost',
    'port': 5433,  # Changed to 5433 based on script info
    'user': 'postgres',
    'password': 'SLB',
    'database': 'Mvtos'
}

def main():
    try:
        print("Connecting to DB...")
        conn = psycopg2.connect(**DB_CONFIG)
        print("Connected.")
        
        repo = PostgresConceptoRepository(conn)
        print("Fetching todos...")
        conceptos = repo.obtener_todos()
        print(f"Fetched {len(conceptos)} conceptos.")
        
        print("First 5:")
        for c in conceptos[:5]:
            print(c)
            
        print("Simulating Router Response Construction...")
        response = [{
            "id": c.conceptoid, 
            "nombre": c.concepto,
            "grupo_id": c.grupoid_fk
        } for c in conceptos]
        print("Response constructed successfully.")
        
    except Exception as e:
        print(f"\nCRASHED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
