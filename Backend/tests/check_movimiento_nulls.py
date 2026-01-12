
import psycopg2
from decimal import Decimal

DB_CONFIG = {
    'host': 'localhost',
    'port': '5433',
    'database': 'Mvtos',
    'user': 'postgres',
    'password': 'SLB'
}

def check_movimiento():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Check details of ID 309
        cursor.execute("SELECT Id, Fecha, Descripcion, Valor, MonedaID, CuentaID, TerceroID, GrupoID FROM movimientos LIMIT 1") # Just checking schema/first
        # Actually want specific ID. If 309 was from my screenshot, it might be dynamic.
        # But I'll search for Tita movements to see if any have NULL Moneda/Cuenta.
        
        print("\nChecking Tita (46) movements for NULL fields:")
        cursor.execute("""
            SELECT Id, Valor, MonedaID, CuentaID 
            FROM movimientos 
            WHERE GrupoID = 46 
              AND (MonedaID IS NULL OR CuentaID IS NULL)
        """)
        rows = cursor.fetchall()
        
        if not rows:
             print("No Tita movements found with NULL Moneda/Cuenta.")
        else:
             print(f"{'ID':<10} {'Valor':<15} {'MonedaID':<10} {'CuentaID':<10}")
             print("-" * 50)
             for r in rows:
                 print(f"{r[0]:<10} {r[1]:<15} {r[2]!r:<10} {r[3]!r:<10}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    check_movimiento()
