import os
import psycopg2
import sys

def migrate():
    print("Starting simplified migration...")
    
    # Get config from env (standard docker-compose names usually)
    # Fallback to defaults that match typical local dev if needed
    host = os.environ.get("DB_HOST", "mvtos_db")
    dbname = os.environ.get("DB_NAME", "Mvtos")
    user = os.environ.get("DB_USER", "postgres")
    password = os.environ.get("DB_PASSWORD", "postgres")
    port = os.environ.get("DB_PORT", "5432")

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
        
        print("Connected. Checking constraints...")
        
        cursor.execute("""
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'matching_alias'::regclass;
        """)
        constraints = [row[0] for row in cursor.fetchall()]
        print(f"Existing constraints: {constraints}")

        # Drop conflicting constraints
        conflicts = ["uq_alias_patron_cuenta", "unique_alias_per_account"]
        for c in conflicts:
            if c in constraints:
                print(f"Dropping {c}...")
                cursor.execute(f"ALTER TABLE matching_alias DROP CONSTRAINT {c};")

        # Add new constraint if not exists
        target = "uq_alias_patron_reemplazo_cuenta"
        if target not in constraints:
            print(f"Adding {target}...")
            cursor.execute("""
                ALTER TABLE matching_alias 
                ADD CONSTRAINT uq_alias_patron_reemplazo_cuenta 
                UNIQUE (cuenta_id, patron, reemplazo);
            """)
        else:
            print(f"{target} already exists.")

        conn.commit()
        print("MIGRATION SUCCESSFUL")
        
    except Exception as e:
        print(f"MIGRATION FAILED: {e}")
        sys.exit(1)
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    migrate()
