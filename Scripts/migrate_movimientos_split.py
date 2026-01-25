
import psycopg2
import os
from datetime import datetime
from decimal import Decimal

# Configuration
DB_HOST = 'localhost'
DB_PORT = '5433'
DB_NAME = 'Mvtos'
DB_USER = 'postgres'
DB_PASSWORD = 'SLB'

def get_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

def run_migration():
    conn = get_connection()
    cursor = conn.cursor()
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_table = f"movimientos_backup_{timestamp}"
    
    try:
        print("Starting migration...")
        
        # 1. Check if we already migrated (basic check)
        cursor.execute("SELECT to_regclass('public.movimientos_encabezado')")
        if cursor.fetchone()[0]:
            print("Target table 'movimientos_encabezado' already exists. Aborting to avoid double migration.")
            return

        # 2. Rename existing table to backup
        print(f"Renaming 'movimientos' to '{backup_table}'...")
        cursor.execute(f"ALTER TABLE movimientos RENAME TO {backup_table}")
        
        # 3. Create movimientos_encabezado
        print("Creating table 'movimientos_encabezado'...")
        # We define Id as SERIAL to have its own sequence.
        # Note: We use mixed case for columns to match original schema style if possible, 
        # but standardizing to lowercase is better. However, existing code uses "CuentaID", "MonedaID".
        # Based on repository, queries use mixed case: "Fecha", "Descripcion", "MonedaID".
        # Postgres is case-insensitive unless quoted. Repository queries don't quote, so columns are snake_case in DB likely?
        # Let's double check column names from the backup table first to be sure.
        
        # Let's assume standard postgres case-insensitive (lowercase) for now, but I will try to respect the naming definition 
        # normally used. Python code uses CamelCase in queries (e.g. "MonedaID").
        # If I create them unquoted, they will be lowercase in DB. 
        # I'll create them as:
        create_header_query = """
        CREATE TABLE movimientos_encabezado (
            Id SERIAL PRIMARY KEY,
            Fecha DATE NOT NULL,
            Descripcion TEXT,
            Referencia TEXT,
            Valor NUMERIC(18, 2) NOT NULL,
            USD NUMERIC(18, 2),
            TRM NUMERIC(18, 2),
            MonedaID INTEGER REFERENCES monedas(monedaid),
            CuentaID INTEGER REFERENCES cuentas(cuentaid),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            Detalle TEXT
        );
        """
        cursor.execute(create_header_query)
        
        # 4. Create movimientos_detalle
        print("Creating table 'movimientos_detalle'...")
        create_detail_query = """
        CREATE TABLE movimientos_detalle (
            id SERIAL PRIMARY KEY,
            movimiento_id INTEGER REFERENCES movimientos_encabezado(Id) ON DELETE CASCADE,
            centro_costo_id INTEGER REFERENCES centro_costos(centro_costo_id),
            ConceptoID INTEGER REFERENCES conceptos(conceptoid),
            TerceroID INTEGER REFERENCES terceros(terceroid),
            Valor NUMERIC(18, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        cursor.execute(create_detail_query)
        
        # 5. Migrate Data
        print("Migrating data from backup...")
        
        # 5.1 Insert into Encabezado
        # We preserve the ID from the original table
        query_migrate_header = f"""
        INSERT INTO movimientos_encabezado (
            Id, Fecha, Descripcion, Referencia, Valor, USD, TRM, 
            MonedaID, CuentaID, created_at, Detalle
        )
        SELECT 
            Id, Fecha, Descripcion, Referencia, Valor, USD, TRM, 
            MonedaID, CuentaID, created_at, Detalle
        FROM {backup_table};
        """
        cursor.execute(query_migrate_header)
        print(f"Migrated {cursor.rowcount} headers.")
        
        # 5.2 Insert into Detalle
        # One-to-one mapping for existing data
        query_migrate_detail = f"""
        INSERT INTO movimientos_detalle (
            movimiento_id, centro_costo_id, ConceptoID, TerceroID, Valor, created_at
        )
        SELECT 
            Id, centro_costo_id, ConceptoID, TerceroID, Valor, created_at
        FROM {backup_table};
        """
        cursor.execute(query_migrate_detail)
        print(f"Migrated {cursor.rowcount} details.")
        
        # 6. Update Sequence for Header
        # Since we inserted IDs manually, the sequence is not updated. We must update it.
        print("Updating sequence for movimientos_encabezado...")
        cursor.execute("SELECT setval('movimientos_encabezado_id_seq', (SELECT MAX(Id) FROM movimientos_encabezado));")
        
        conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
