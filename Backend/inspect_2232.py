
import os
import psycopg2
from decimal import Decimal

def inspect_movement_2232():
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
        
        print("\n--- INSPECTING MOVIMIENTO 2232 ---")
        
        # 1. Check Encabezado
        print("\n[ENCABEZADO]")
        cursor.execute("""
            SELECT Id, Fecha, Descripcion, Valor, CuentaID, terceroid, Detalle
            FROM movimientos_encabezado
            WHERE Id = 2232
        """)
        row = cursor.fetchone()
        if row:
            print(f"ID: {row[0]}")
            print(f"Fecha: {row[1]}")
            print(f"Descripción: {row[2]}")
            print(f"Valor: {row[3]}")
            print(f"CuentaID: {row[4]}")
            print(f"TerceroID: {row[5]}")
            print(f"Detalle: {row[6]}")
        else:
            print("Movement 2232 NOT FOUND in Encabezado")
            
        # 2. Check Detalles
        print("\n[DETALLES]")
        cursor.execute("""
            SELECT id, movimiento_id, centro_costo_id, conceptoid, terceroid, valor
            FROM movimientos_detalle
            WHERE movimiento_id = 2232
        """)
        rows = cursor.fetchall()
        if rows:
            for r in rows:
                print(f"Detalle ID: {r[0]}")
                print(f"  Movimiento ID: {r[1]}")
                print(f"  Centro Costo ID: {r[2]}")
                print(f"  Concepto ID: {r[3]}")
                print(f"  Tercero ID: {r[4]}")
                print(f"  Valor: {r[5]}")
        else:
            print("No Details found for 2232")

        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_movement_2232()
