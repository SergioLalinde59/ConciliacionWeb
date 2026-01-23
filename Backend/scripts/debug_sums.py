
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
    
    # Check for movements with +/- 4
    cursor.execute("""
        SELECT * FROM movimientos 
        WHERE (Valor = 4 OR Valor = -4)
        AND EXTRACT(YEAR FROM Fecha) = 2025
        AND EXTRACT(MONTH FROM Fecha) = 1;
    """)
    rows = cursor.fetchall()
    print(f"Movements with value 4/-4: {rows}")
    
    # Calculate sum via SQL
    cursor.execute("""
        SELECT 
            COALESCE(SUM(CASE WHEN Valor > 0 THEN Valor ELSE 0 END), 0) as entradas,
            COALESCE(SUM(CASE WHEN Valor < 0 THEN ABS(Valor) ELSE 0 END), 0) as salidas
        FROM movimientos
        WHERE 
          EXTRACT(YEAR FROM Fecha) = 2025 
          AND EXTRACT(MONTH FROM Fecha) = 1
          AND CuentaID = (SELECT CuentaID FROM cuentas WHERE Nombre = 'FondoRenta' LIMIT 1);
    """)
    sql_sum = cursor.fetchone()
    print(f"SQL Sum (Entradas, Salidas): {sql_sum}")
    
    cursor.close()
    conn.close()

except Exception as e:
    print(f"Error: {e}")
