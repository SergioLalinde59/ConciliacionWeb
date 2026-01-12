import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    port=os.getenv('DB_PORT', '5433'),
    database=os.getenv('DB_NAME', 'Mvtos'), 
    user=os.getenv('DB_USER', 'postgres'), 
    password=os.getenv('DB_PASSWORD')
)
cur = conn.cursor()

# Delete duplicate Mc Pesos records from December 2025 that are:
# - Positive value (duplicates)
# - Unclassified (tercero_id IS NULL)
cur.execute("""
    DELETE FROM movimientos 
    WHERE cuentaid = 6 
    AND fecha >= '2025-12-01' 
    AND fecha <= '2025-12-31'
    AND valor > 0
    AND terceroid IS NULL
""")
print(f'Registros eliminados: {cur.rowcount}')
conn.commit()
cur.close()
conn.close()
