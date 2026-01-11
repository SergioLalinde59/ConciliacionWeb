import sys
import os
import psycopg2
from psycopg2 import sql

# Add the Backend path to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

# Manually load connection settings to avoid importing too many internal modules if they are broken
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5433'),
    'database': os.getenv('DB_NAME', 'Mvtos'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD')
}

def drop_column():
    print("Connecting to database...")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        print("Checking if column 'es_traslado' exists in 'grupos'...")
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='grupos' AND column_name='es_traslado'
        """)
        
        if cur.fetchone():
            print("Column exists. Dropping column...")
            cur.execute("ALTER TABLE grupos DROP COLUMN es_traslado")
            conn.commit()
            print("Column 'es_traslado' dropped successfully.")
        else:
            print("Column 'es_traslado' does not exist.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    drop_column()
