import os
import psycopg2
import sys
from decimal import Decimal

def migrate():
    print("Starting migration: Split Movimientos into Encabezado/Detalle...")
    
    # Updated defaults based on local .env file
    host = os.environ.get("DB_HOST", "localhost")
    dbname = os.environ.get("DB_NAME", "Mvtos")
    user = os.environ.get("DB_USER", "postgres")
    password = os.environ.get("DB_PASSWORD", "SLB")
    port = os.environ.get("DB_PORT", "5433")

    print(f"Connecting to {host}:{port}/{dbname} as {user}...")

    try:
        conn = psycopg2.connect(
            host=host,
            database=dbname,
            user=user,
            password=password,
            port=port
        )
        conn.autocommit = False
        cursor = conn.cursor()
        
        # 1. Rename movements table if not already renamed
        # We check if 'movimientos' exists and 'movimientos_encabezado' does not.
        cursor.execute("SELECT to_regclass('public.movimientos');")
        movimientos_exists = cursor.fetchone()[0] is not None
        
        cursor.execute("SELECT to_regclass('public.movimientos_encabezado');")
        encabezado_exists = cursor.fetchone()[0] is not None
        
        if movimientos_exists and not encabezado_exists:
            print("Renaming 'movimientos' to 'movimientos_encabezado'...")
            cursor.execute("ALTER TABLE movimientos RENAME TO movimientos_encabezado;")
        elif encabezado_exists:
            print("Table 'movimientos_encabezado' already exists. Skipping rename.")
        else:
             print("Table 'movimientos' not found. Checking if we can proceed...")

        # 2. DROP and CREATE Detalle table
        print("Dropping 'movimientos_detalle' if exists...")
        cursor.execute("DROP TABLE IF EXISTS movimientos_detalle CASCADE;")
        
        print("Creating table 'movimientos_detalle' (structure only)...")
        cursor.execute("""
            CREATE TABLE movimientos_detalle (
                id SERIAL PRIMARY KEY,
                movimiento_id INTEGER NOT NULL,
                centro_costo_id INTEGER,
                concepto_id INTEGER,
                valor NUMERIC(15, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2b. Add Foreign Keys one by one using SAVEPOINTs
        print("Adding FK to movimientos_encabezado...")
        try:
            cursor.execute("SAVEPOINT fk_encabezado")
            cursor.execute("""
                ALTER TABLE movimientos_detalle 
                ADD CONSTRAINT fk_movimiento_detalle_encabezado 
                FOREIGN KEY (movimiento_id) 
                REFERENCES movimientos_encabezado (id) 
                ON DELETE CASCADE;
            """)
            cursor.execute("RELEASE SAVEPOINT fk_encabezado")
        except Exception as e:
             cursor.execute("ROLLBACK TO SAVEPOINT fk_encabezado")
             print(f"Error adding FK encabezado: {e}")

        print("Adding FK to centro_costos...")
        try:
            cursor.execute("SAVEPOINT fk_centro")
            cursor.execute("""
                ALTER TABLE movimientos_detalle 
                ADD CONSTRAINT fk_movimiento_detalle_centro 
                FOREIGN KEY (centro_costo_id) 
                REFERENCES centro_costos (centro_costo_id);
            """)
            cursor.execute("RELEASE SAVEPOINT fk_centro")
        except Exception as e:
             cursor.execute("ROLLBACK TO SAVEPOINT fk_centro")
             print(f"Error adding FK centro_costos: {e}")

        print("Adding FK to conceptos...")
        try:
            cursor.execute("SAVEPOINT fk_concepto")
            cursor.execute("""
                ALTER TABLE movimientos_detalle 
                ADD CONSTRAINT fk_movimiento_detalle_concepto 
                FOREIGN KEY (concepto_id) 
                REFERENCES conceptos (conceptoid);
            """)
            cursor.execute("RELEASE SAVEPOINT fk_concepto")
        except Exception as e:
             cursor.execute("ROLLBACK TO SAVEPOINT fk_concepto")
             print(f"Error adding FK conceptos: {e}")
             if hasattr(e, 'pgerror'): print(f"PG Error: {e.pgerror}") # Debug extra
             
             # Proceed without this FK
             
        # ... logic continues ...


        # 3. Migrate existing classification from Encabezado to Detalle
        # Only if the columns still exist in Encabezado
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='movimientos_encabezado' AND column_name='centro_costo_id';
        """)
        has_centro = cursor.fetchone()

        if has_centro:
            print("Migrating existing classification to detalles...")
            # Insert into detalle taking values from encabezado
            cursor.execute("""
                INSERT INTO movimientos_detalle (movimiento_id, centro_costo_id, concepto_id, valor)
                SELECT id, centro_costo_id, concepto_id, valor
                FROM movimientos_encabezado
                WHERE centro_costo_id IS NOT NULL OR concepto_id IS NOT NULL;
            """)
            print(f"Migrated {cursor.rowcount} records.")
            
            # 4. Drop columns from Encabezado
            print("Dropping old columns from 'movimientos_encabezado'...")
            cursor.execute("""
                ALTER TABLE movimientos_encabezado 
                DROP COLUMN IF EXISTS centro_costo_id,
                DROP COLUMN IF EXISTS concepto_id;
            """)
        else:
            print("Columns 'centro_costo_id/concepto_id' not found in encabezado. Data likely already migrated.")

        conn.commit()
        print("MIGRATION SUCCESSFUL")
        
    except Exception as e:
        print(f"MIGRATION FAILED: {e}")
        if hasattr(e, 'pgerror'):
            print(f"PG Error: {e.pgerror}")
        if hasattr(e, 'diag'):
            print(f"Diag Primary: {e.diag.message_primary}")
            print(f"Diag Detail: {e.diag.message_detail}")
            print(f"Diag Hint: {e.diag.message_hint}")
        if conn:
            conn.rollback()
        sys.exit(1)
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    migrate()
