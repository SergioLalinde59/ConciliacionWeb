
import sys
import os

# Ensure root is in path
current_dir = os.path.dirname(os.path.abspath(__file__))
# Project root is assumed to be where this script is: f:\...\Backend
sys.path.append(os.getcwd()) 

try:
    from src.infrastructure.database.connection import get_db_connection
except ImportError:
    # Try adding src to path explicitly if run from inside Backend
    sys.path.append(os.path.join(os.getcwd(), 'src'))
    from src.infrastructure.database.connection import get_db_connection

from datetime import date

def debug():
    try:
        gen = get_db_connection()
        conn = next(gen)
        cursor = conn.cursor()

        # 1. Check Cuentas
        # Corrected columns: cuentaid, cuenta
        print("--- Cuentas ---")
        cursor.execute("SELECT cuentaid, cuenta FROM cuentas WHERE cuenta LIKE '%Fondo%' OR cuenta LIKE '%Renta%'")
        rows = cursor.fetchall()
        fondo_renta_id = None
        for row in rows:
            print(row)
            if 'FondoRenta' in row[1] or 'Fondo' in row[1]: 
                 fondo_renta_id = row[0]
        
        if not fondo_renta_id:
            print("Could not find FondoRenta account ID.")
            return

        print(f"\nFondoRenta ID seems to be: {fondo_renta_id}")

        # 2. Check MovimientosExtracto
        print("\n--- Movimientos Extracto (Jan, Feb, Apr 2025) ---")
        periods = [(2025, 1), (2025, 2), (2025, 4)]
        for y, m in periods:
            cursor.execute("""
                SELECT count(*) FROM movimientos_extracto 
                WHERE cuenta_id = %s AND year = %s AND month = %s
            """, (fondo_renta_id, y, m))
            count = cursor.fetchone()[0]
            print(f"Period {y}-{m}: {count} rows")

        # 3. Check Conciliaciones
        print("\n--- Conciliaciones (Jan, Feb, Apr 2025) ---")
        for y, m in periods:
            cursor.execute("""
                SELECT extracto_saldo_anterior, extracto_entradas, extracto_salidas, extracto_saldo_final 
                FROM conciliaciones 
                WHERE cuenta_id = %s AND year = %s AND month = %s
            """, (fondo_renta_id, y, m))
            row = cursor.fetchone()
            print(f"Period {y}-{m}: {row}")

        # 4. Check Cuenta Extractors
        print("\n--- Cuenta Extractors Configuration ---")
        try:
            cursor.execute("SELECT * FROM cuenta_extractores WHERE cuenta_id = %s", (fondo_renta_id,))
            rows = cursor.fetchall()
            if not rows:
                print("No dynamic configuration found in cuenta_extractores (using hardcoded fallback in APP).")
                # print hardcoded fallback assumption
                print("Hardcoded fallback in Service seems to be: 'fondorenta_movimientos'")
            else:
                for row in rows:
                    print(row)
        except Exception as e:
            print(f"Error checking cuenta_extractores: {e}")

        conn.close()
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug()
