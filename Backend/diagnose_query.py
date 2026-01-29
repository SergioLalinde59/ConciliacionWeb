import os
import psycopg2
import sys

def diagnose():
    host = os.environ.get("DB_HOST", "localhost")
    dbname = os.environ.get("DB_NAME", "Mvtos")
    user = os.environ.get("DB_USER", "postgres")
    password = os.environ.get("DB_PASSWORD", "postgres")
    port = os.environ.get("DB_PORT", "5432")
    
    print(f"CONNECTING TO: {dbname} as {user} on {host}:{port}")
    
    try:
        conn = psycopg2.connect(
            host=host,
            database=dbname,
            user=user,
            password=password,
            port=port
        )
        cursor = conn.cursor()
        
        # Test 1: Standard
        print("\nTest 1: SELECT count(*) FROM movimientos_encabezado")
        try:
            cursor.execute("SELECT count(*) FROM movimientos_encabezado")
            print(f"SUCCESS: {cursor.fetchone()[0]}")
        except Exception as e:
            print(f"FAILED: {e}")
            conn.rollback()

        # Test 2: Public schema qualified
        print("\nTest 2: SELECT count(*) FROM public.movimientos_encabezado")
        try:
            cursor.execute("SELECT count(*) FROM public.movimientos_encabezado")
            print(f"SUCCESS: {cursor.fetchone()[0]}")
        except Exception as e:
            print(f"FAILED: {e}")
            conn.rollback()

        # Test 3: Quoted table
        print("\nTest 3: SELECT count(*) FROM \"movimientos_encabezado\"")
        try:
            cursor.execute("SELECT count(*) FROM \"movimientos_encabezado\"")
            print(f"SUCCESS: {cursor.fetchone()[0]}")
        except Exception as e:
            print(f"FAILED: {e}")
            conn.rollback()

        # Test 4: Quoted public schema qualified
        print("\nTest 4: SELECT count(*) FROM \"public\".\"movimientos_encabezado\"")
        try:
            cursor.execute("SELECT count(*) FROM \"public\".\"movimientos_encabezado\"")
            print(f"SUCCESS: {cursor.fetchone()[0]}")
        except Exception as e:
            print(f"FAILED: {e}")
            conn.rollback()
            
        # Test 5: Mixed Case (Just in case)
        print("\nTest 5: SELECT count(*) FROM \"Movimientos_Encabezado\"")
        try:
            cursor.execute("SELECT count(*) FROM \"Movimientos_Encabezado\"")
            print(f"SUCCESS: {cursor.fetchone()[0]}")
        except Exception as e:
            print(f"FAILED: {e}")
            conn.rollback()

        conn.close()
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")

if __name__ == "__main__":
    diagnose()
