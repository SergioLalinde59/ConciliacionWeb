import sys
import psycopg2
from collections import defaultdict

# DB Config (Standard for this env)
DB_CONFIG = {
    "dbname": "conciliacionweb",
    "user": "postgres",
    "password": "password",
    "host": "localhost",
    "port": "5432"
}

# Override with docker-compose service name if running inside container, but here running from host?
# The user ran `arranque_app.ps1`, which starts docker containers. 
# The Python logs show `mvtos_backend` connecting to `mvtos_db`.
# From the host, I can try connecting to localhost:5432 if port is exposed?
# `arranque_app.ps1` usually maps ports. If not, I can't connect from host script.
# But I can try. IF not, I will ask user to run in container or just update the code based on strong hypothesis.

def check_duplicates(cuenta_id=1): # Default account 1
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # 1. Get all vinculaciones for this account (via extracto join)
        query = """
            SELECT mv.movimiento_sistema_id, COUNT(*), ARRAY_AGG(mv.movimiento_extracto_id), ARRAY_AGG(me.fecha)
            FROM movimiento_vinculaciones mv
            JOIN movimientos_extracto me ON mv.movimiento_extracto_id = me.id
            WHERE me.cuenta_id = %s
            AND mv.movimiento_sistema_id IS NOT NULL
            GROUP BY mv.movimiento_sistema_id
            HAVING COUNT(*) > 1
        """
        
        cursor.execute(query, (cuenta_id,))
        rows = cursor.fetchall()
        
        print(f"--- DUPLICATES REPORT FOR ACCOUNT {cuenta_id} ---")
        if not rows:
            print("No duplicates found globally (ignoring date filters).")
        else:
            print(f"Found {len(rows)} system movements used more than once!")
            for row in rows:
                sys_id, count, ext_ids, feches = row
                print(f"Sys ID {sys_id} is used {count} times by extract items: IDs {ext_ids} Dates {feches}")
                
        # 2. Check DB dates for a specific period (e.g. Jan 2025) to see why validation failed
        # User screenshot shows Account "MasterCardPesos". I need to find its ID.
        cursor.execute("SELECT cuentaid, cuenta FROM cuentas")
        print("\n--- ACCOUNTS ---")
        cuentas = cursor.fetchall()
        for c in cuentas:
            print(f"ID {c[0]}: {c[1]}")
            
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error connecting/querying: {e}")

if __name__ == "__main__":
    check_duplicates(6) # Assuming ID 6 from logs (GET /api/matching/6/2026/1)
