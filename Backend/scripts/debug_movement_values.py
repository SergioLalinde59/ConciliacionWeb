
import psycopg2
import os
import sys

def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5433'),
            database=os.getenv('DB_NAME', 'Mvtos'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD')
        )
        return conn
    except Exception as e:
        print(f"Error connecting to DB: {e}")
        return None

def inspect_movement():
    conn = get_db_connection()
    if not conn:
        print("Failed to connect.")
        return

    try:
        cur = conn.cursor()
        # Search for the movement described: Account 7 (MasterCardUSD), Date 2026-01-13 (approx), desc includes Google
        # Table: movimientos_encabezado
        # Columns: Id, Fecha, Descripcion, Valor, USD, TRM, CuentaID, MonedaID
        query = """
            SELECT Id, Fecha, Descripcion, Valor, USD, TRM, CuentaID, MonedaID 
            FROM movimientos_encabezado 
            WHERE Descripcion ILIKE '%Google%Cloud%' 
            AND CuentaID = 7
            ORDER BY Fecha DESC
            LIMIT 5
        """
        
        cur.execute(query)
        rows = cur.fetchall()
        
        print(f"Found {len(rows)} matching movements:")
        for row in rows:
            # 0: Id, 1: Fecha, 2: Descripcion, 3: Valor, 4: USD, 5: TRM, 6: CuentaID, 7: MonedaID
            print(f"ID: {row[0]}, Date: {row[1]}, Desc: {row[2]}")
            print(f"   Valor (COP/Nominal): {row[3]} ({type(row[3])})")
            print(f"   USD: {row[4]} ({type(row[4])})")
            print(f"   TRM: {row[5]}")
            print("-" * 30)
            
        cur.close()
    except Exception as e:
        print(f"Error executing query: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    inspect_movement()
