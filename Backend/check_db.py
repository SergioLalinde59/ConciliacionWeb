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
    
    # List tables in public schema
    cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'movimientos_encabezado%';")
    tables = cursor.fetchall()
    print("\nMatching tables found:")
    for t in tables:
        print(f"- {t[0]}")
        
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
