
import psycopg2
import os
from dotenv import load_dotenv

# Load env from Backend/.env
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
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'movimientos' AND column_name = 'fecha';
    """)
    res = cursor.fetchone()
    print(f"Column 'fecha' type: {res}")
    
    # Also check if there are any records with non-zero time
    cursor.execute("""
        SELECT COUNT(*) FROM movimientos 
        WHERE EXTRACT(HOUR FROM Fecha) > 0 OR EXTRACT(MINUTE FROM Fecha) > 0 OR EXTRACT(SECOND FROM Fecha) > 0;
    """)
    count_time = cursor.fetchone()[0]
    print(f"Records with non-zero time: {count_time}")

    cursor.close()
    conn.close()

except Exception as e:
    print(f"Error: {e}")
