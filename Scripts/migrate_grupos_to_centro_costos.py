
import psycopg2
import os
import sys
from dotenv import load_dotenv

# Add Backend to path to easily import if needed, but we can just replicate the config logic for a simple script
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'Backend'))

# Load environment variables (try specific path if generic fails)
# We assume the script is run from project root, or we try to find .env in Backend
env_path = os.path.join(os.path.dirname(__file__), '..', 'Backend', '.env')
if os.path.exists(env_path):
    print(f"Loading .env from {env_path}")
    load_dotenv(env_path)
else:
    print("Loading .env from default locations")
    load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5433'),
    'database': os.getenv('DB_NAME', 'Mvtos'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD')
}

def migrate():
    print("Starting migration...")
    print(f"Connecting to {DB_CONFIG['host']}:{DB_CONFIG['port']} / {DB_CONFIG['database']} as {DB_CONFIG['user']}")
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False # We want a transaction
        cursor = conn.cursor()
        
        try:
            # 1. Rename Tables
            print("Renaming table 'grupos' to 'centro_costos'...")
            cursor.execute("ALTER TABLE IF EXISTS grupos RENAME TO centro_costos;")
            
            print("Renaming table 'config_filtros_grupos' to 'config_filtros_centro_costos'...")
            cursor.execute("ALTER TABLE IF EXISTS config_filtros_grupos RENAME TO config_filtros_centro_costos;")

            # 2. Rename Columns in centro_costos
            print("Renaming columns in 'centro_costos'...")
            # Note: The PK was 'grupoid', name was 'grupo'
            cursor.execute("ALTER TABLE centro_costos RENAME COLUMN grupoid TO centro_costo_id;")
            cursor.execute("ALTER TABLE centro_costos RENAME COLUMN grupo TO centro_costo;")

            # 3. Rename foreign key columns in other tables
            print("Renaming columns in 'conceptos'...")
            # concepts had 'grupoid_fk'
            cursor.execute("ALTER TABLE conceptos RENAME COLUMN grupoid_fk TO centro_costo_id;")

            print("Renaming columns in 'movimientos'...")
            # movimientos had 'GrupoID' in queries, which resolves to 'grupoid'
            cursor.execute("ALTER TABLE movimientos RENAME COLUMN grupoid TO centro_costo_id;") 
            
            print("Renaming columns in 'config_filtros_centro_costos'...")
            # This one had 'grupo_id' according to repo
            cursor.execute("ALTER TABLE config_filtros_centro_costos RENAME COLUMN grupo_id TO centro_costo_id;")

            conn.commit()
            print("Migration completed successfully!")
            
        except psycopg2.Error as e:
            conn.rollback()
            print(f"Error executing migration: {e}")
            sys.exit(1)
        finally:
            cursor.close()
            conn.close()

    except Exception as e:
        print(f"Failed to connect or run migration: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate()
