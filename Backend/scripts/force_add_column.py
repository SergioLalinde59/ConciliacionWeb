import sys
import os

# Adjust path to include backend root
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from src.infrastructure.database.connection import get_db_connection

def force_add():
    print("🚀 Force Adding Column...")
    conn_gen = get_db_connection()
    conn = next(conn_gen)
    conn.autocommit = True # Try autocommit
    
    cursor = conn.cursor()
    
    # 1. Check before
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='reglas_clasificacion';")
    print(f"Before: {[r[0] for r in cursor.fetchall()]}")
    
    try:
        # 2. Add
        print("Executing ALTER TABLE...")
        cursor.execute("ALTER TABLE reglas_clasificacion ADD COLUMN IF NOT EXISTS cuenta_id INTEGER REFERENCES cuentas(cuentaid);")
        print("Executed ALTER.")
        
        # 3. Check after
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='reglas_clasificacion';")
        print(f"After: {[r[0] for r in cursor.fetchall()]}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    force_add()
