
import psycopg2
import os
from decimal import Decimal
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

DB_NAME = os.getenv("DB_NAME", "conciliacion_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

try:
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )
    cursor = conn.cursor()
    
    # Calculate sum via SQL
    # Get account ID first
    cursor.execute("SELECT CuentaID FROM cuentas WHERE Cuenta = 'FondoRenta' LIMIT 1;")
    res = cursor.fetchone()
    if not res:
        print("Account 'FondoRenta' not found using column 'Cuenta'. Trying 'Nombre'...")
        # Try finding column name
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'cuentas';")
        cols = [c[0] for c in cursor.fetchall()]
        print(f"Columns in cuentas: {cols}")
        cursor.close()
        conn.close()
        exit()

    cuenta_id = res[0]
    print(f"CuentaID: {cuenta_id}")

    cursor.execute("""
        SELECT 
            COALESCE(SUM(CASE WHEN Valor > 0 THEN Valor ELSE 0 END), 0) as entradas,
            COALESCE(SUM(CASE WHEN Valor < 0 THEN ABS(Valor) ELSE 0 END), 0) as salidas
        FROM movimientos
        WHERE 
          EXTRACT(YEAR FROM Fecha) = 2025 
          AND EXTRACT(MONTH FROM Fecha) = 1
          AND CuentaID = %s;
    """, (cuenta_id,))
    sql_sum = cursor.fetchone()
    print(f"SQL Sum (Entradas, Salidas): {sql_sum}")
    
    # Now verify with date range
    cursor.execute("""
        SELECT 
            COALESCE(SUM(CASE WHEN Valor > 0 THEN Valor ELSE 0 END), 0) as entradas,
            COALESCE(SUM(CASE WHEN Valor < 0 THEN ABS(Valor) ELSE 0 END), 0) as salidas
        FROM movimientos
        WHERE 
          Fecha >= '2025-01-01' AND Fecha <= '2025-01-31'
          AND CuentaID = %s;
    """, (cuenta_id,))
    range_sum = cursor.fetchone()
    print(f"Range Sum (Entradas, Salidas): {range_sum}")

    cursor.close()
    conn.close()

except Exception as e:
    print(f"Error: {e}")
