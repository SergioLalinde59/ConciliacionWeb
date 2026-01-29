
import os
import psycopg2

def inspect_catalogs_2232():
    host = os.environ.get("DB_HOST", "localhost")
    dbname = os.environ.get("DB_NAME", "Mvtos")
    user = os.environ.get("DB_USER", "postgres")
    password = os.environ.get("DB_PASSWORD", "postgres")
    port = os.environ.get("DB_PORT", "5432")

    try:
        conn = psycopg2.connect(
            host=host,
            database=dbname,
            user=user,
            password=password,
            port=port
        )
        cursor = conn.cursor()
        
        print("\n--- CHECKING CATALOG INTEGRITY FOR IDs FOUND IN 2232 ---")
        
        # IDs found: Tercero=70, CC=46, Concepto=386
        tid = 70
        ccid = 46
        cid = 386
        
        # 1. Check Tercero
        cursor.execute("SELECT terceroid, tercero FROM terceros WHERE terceroid = %s", (tid,))
        row = cursor.fetchone()
        if row:
            print(f"[OK] Tercero {tid} exists: '{row[1]}'")
        else:
            print(f"[FAIL] Tercero {tid} DOES NOT EXIST")
            
        # 2. Check Centro Costo
        cursor.execute("SELECT centro_costo_id, centro_costo FROM centro_costos WHERE centro_costo_id = %s", (ccid,))
        row = cursor.fetchone()
        if row:
            print(f"[OK] Centro Costo {ccid} exists: '{row[1]}'")
        else:
            print(f"[FAIL] Centro Costo {ccid} DOES NOT EXIST")
            
        # 3. Check Concepto
        cursor.execute("SELECT conceptoid, concepto, centro_costo_id FROM conceptos WHERE conceptoid = %s", (cid,))
        row = cursor.fetchone()
        if row:
            print(f"[OK] Concepto {cid} exists: '{row[1]}' (Parent CC: {row[2]})")
        else:
            print(f"[FAIL] Concepto {cid} DOES NOT EXIST")

        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_catalogs_2232()
