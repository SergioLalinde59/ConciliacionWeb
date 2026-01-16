
import sys
import os
from datetime import date

# Add Backend to python path
sys.path.append(os.path.join(os.getcwd(), 'Backend'))

from src.infrastructure.database.connection import get_connection_pool
from src.infrastructure.database.postgres_conciliacion_repository import PostgresConciliacionRepository
from src.domain.models.conciliacion import Conciliacion

def initialize_conciliaciones():
    print("Initializing connection pool...")
    pool = get_connection_pool()
    conn = pool.getconn()
    
    try:
        cursor = conn.cursor()
        repo = PostgresConciliacionRepository(conn)
        
        print("Finding periods with movements...")
        # Find all distinct account/year/month combinations from movements
        query = """
            SELECT DISTINCT 
                CuentaID,
                EXTRACT(YEAR FROM Fecha)::INT as year,
                EXTRACT(MONTH FROM Fecha)::INT as month
            FROM movimientos
            WHERE CuentaID IS NOT NULL
            ORDER BY year DESC, month DESC, CuentaID
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        
        print(f"Found {len(rows)} periods to reconcile.")
        
        for row in rows:
            cuenta_id, year, month = row
            print(f"Processing Account {cuenta_id} - Period {year}-{month}...")
            
            # Check if exists
            existing = repo.obtener_por_periodo(cuenta_id, year, month)
            
            if not existing:
                print(f"  > Creating new reconciliation record...")
                # Create base record
                new_rec = Conciliacion(
                    id=None,
                    cuenta_id=cuenta_id,
                    year=year,
                    month=month,
                    fecha_corte=date(year, month, 1), # Default 1st of month
                    extracto_saldo_anterior=0,
                    extracto_entradas=0,
                    extracto_salidas=0,
                    extracto_saldo_final=0,
                    datos_extra={},
                    estado='PENDIENTE'
                )
                repo.guardar(new_rec)
                
            # Perform system calculation (always update system values)
            repo.recalcular_sistema(cuenta_id, year, month)
            print(f"  > System values updated.")
            
        print("Initialization complete.")
        
    except Exception as e:
        print(f"Error initializing conciliaciones: {e}")
        conn.rollback()
        raise e
    finally:
        pool.putconn(conn)
        pool.closeall()

if __name__ == "__main__":
    initialize_conciliaciones()
