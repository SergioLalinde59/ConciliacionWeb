import os
import sys
import psycopg2
from src.infrastructure.database.connection import get_db_connection

def update_constraint():
    conn = None
    try:
        conn = get_db_connection()
        conn.autocommit = False
        cursor = conn.cursor()

        print("--- Checking existing constraints ---")
        cursor.execute("""
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'matching_alias'::regclass;
        """)
        constraints = [row[0] for row in cursor.fetchall()]
        print(f"Current constraints: {constraints}")

        print("--- Migrating ---")
        # Try dropping both possible names just in case
        for name in ["uq_alias_patron_cuenta", "unique_alias_per_account"]:
            if name in constraints:
                print(f"Dropping constraint: {name}")
                cursor.execute(f"ALTER TABLE matching_alias DROP CONSTRAINT {name};")
            else:
                print(f"Constraint {name} not found, skipping.")

        # Check if new constraint already exists
        if "uq_alias_patron_reemplazo_cuenta" not in constraints:
            print("Adding new constraint uq_alias_patron_reemplazo_cuenta")
            cursor.execute("""
                ALTER TABLE matching_alias 
                ADD CONSTRAINT uq_alias_patron_reemplazo_cuenta 
                UNIQUE (cuenta_id, patron, reemplazo);
            """)
        else:
            print("New constraint already exists.")

        conn.commit()
        print("Migration successful.")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"ERROR: {e}")
        # Print constraint violation details if available
        if isinstance(e, psycopg2.Error):
             print(f"PgCode: {e.pgcode}, PgError: {e.pgerror}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    update_constraint()
