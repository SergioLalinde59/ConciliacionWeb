
import sys
import os

# Ensure root is in path
sys.path.append(os.getcwd()) 
try:
    from src.infrastructure.database.connection import get_db_connection
except ImportError:
    sys.path.append(os.path.join(os.getcwd(), 'src'))
    from src.infrastructure.database.connection import get_db_connection

def update_config():
    try:
        gen = get_db_connection()
        conn = next(gen)
        cursor = conn.cursor()

        # CONFIGURATION TO APPLY
        # (cuenta_id, tipo, modulo, orden)
        configs = [
            # ID 1: Ahorros
            (1, 'MOVIMIENTOS', 'ahorros_extracto_movimientos', 1),
            
            # ID 3: FondoRenta (THE FIX)
            (3, 'MOVIMIENTOS', 'fondorenta_extracto_movimientos', 1),
            
            # ID 6: MasterCard Pesos
            (6, 'MOVIMIENTOS', 'mastercard_pesos_extracto_movimientos', 1),
            (6, 'MOVIMIENTOS', 'mastercard_pesos_extracto_anterior_movimientos', 2),
            
            # ID 7: MasterCard USD
            (7, 'MOVIMIENTOS', 'mastercard_usd_extracto_movimientos', 1),
            (7, 'MOVIMIENTOS', 'mastercard_usd_extracto_anterior_movimientos', 2),
        ]

        print("--- Updating Configuration ---")
        
        # 1. Clean existing MOVIMIENTOS config for these accounts
        # Note: Be careful not to delete RESUMEN config if it exists
        ids = [1, 3, 6, 7]
        cursor.execute("DELETE FROM cuenta_extractores WHERE cuenta_id = ANY(%s) AND tipo = 'MOVIMIENTOS'", (ids,))
        print(f"Deleted existing MOVIMIENTOS configuration for accounts {ids}")

        # 2. Insert new config
        # REMOVED fecha_creacion
        query = """
            INSERT INTO cuenta_extractores (cuenta_id, tipo, modulo, orden, activo)
            VALUES (%s, %s, %s, %s, TRUE)
        """
        
        for cfg in configs:
            cursor.execute(query, cfg)
            print(f"Inserted: Account {cfg[0]} -> {cfg[2]} (Order {cfg[3]})")

        conn.commit()
        print("\n--- Update Complete ---")
        
        # Verify
        print("\n--- Verification ---")
        cursor.execute("SELECT cuenta_id, modulo, orden, activo FROM cuenta_extractores WHERE tipo = 'MOVIMIENTOS' ORDER BY cuenta_id, orden")
        rows = cursor.fetchall()
        for row in rows:
            print(row)

        conn.close()
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    update_config()
