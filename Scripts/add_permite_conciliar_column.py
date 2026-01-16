
import sys
import os

# Add Backend to python path to allow imports
sys.path.append(os.path.join(os.getcwd(), 'Backend'))

from src.infrastructure.database.connection import get_connection_pool

def update_schema():
    print("Initializing connection pool...")
    try:
        pool = get_connection_pool()
        conn = pool.getconn()
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        return

    try:
        cursor = conn.cursor()
        print("Executing ALTER TABLE sql...")
        
        sql = """
        ALTER TABLE cuentas ADD COLUMN IF NOT EXISTS permite_conciliar BOOLEAN DEFAULT FALSE;
        """
        
        cursor.execute(sql)
        conn.commit()
        print("Table 'cuentas' updated successfully: Added 'permite_conciliar' column.")
        
    except Exception as e:
        conn.rollback()
        print(f"Error updating table: {e}")
        raise e
    finally:
        if 'conn' in locals():
            pool.putconn(conn)
        pool.closeall()

if __name__ == "__main__":
    update_schema()
