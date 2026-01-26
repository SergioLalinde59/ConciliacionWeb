import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'host.docker.internal'),
    'port': os.getenv('DB_PORT', '5433'),
    'database': os.getenv('DB_NAME', 'Mvtos'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'SLB')
}

print(f"Connecting to {DB_CONFIG['database']} at {DB_CONFIG['host']}:{DB_CONFIG['port']}...")

try:
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    # 1. Drop existing incorrect constraint
    print("Dropping incorrect constraint...")
    cursor.execute("ALTER TABLE movimiento_vinculaciones DROP CONSTRAINT IF EXISTS movimiento_vinculaciones_movimiento_sistema_id_fkey;")
    
    # 2. Add correct constraint referencing movimientos_encabezado
    # We use Id (capital I) because information_schema/dt usually show it as such for SQL tables
    # though Postgres is case-insensitive unless quoted.
    print("Adding correct constraint referencing movimientos_encabezado(Id)...")
    cursor.execute("""
    ALTER TABLE movimiento_vinculaciones 
    ADD CONSTRAINT movimiento_vinculaciones_movimiento_sistema_id_fkey 
    FOREIGN KEY (movimiento_sistema_id) 
    REFERENCES movimientos_encabezado(Id)
    ON DELETE CASCADE;
    """)
    
    conn.commit()
    print("Database constraints fixed successfully!")
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
    if conn:
        conn.rollback()
