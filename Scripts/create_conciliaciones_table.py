
import sys
import os

# Add Backend to python path to allow imports
sys.path.append(os.path.join(os.getcwd(), 'Backend'))

from src.infrastructure.database.connection import get_connection_pool

def create_table():
    print("Initializing connection pool...")
    pool = get_connection_pool()
    conn = pool.getconn()
    try:
        cursor = conn.cursor()
        print("Executing CREATE TABLE sql...")
        
        sql = """
        CREATE TABLE IF NOT EXISTS conciliaciones (
            id SERIAL PRIMARY KEY,
            cuenta_id INTEGER NOT NULL REFERENCES cuentas(cuentaid),
            year INTEGER NOT NULL,          
            month INTEGER NOT NULL,           
            fecha_corte DATE NOT NULL,      
            
            extracto_saldo_anterior NUMERIC(16, 2) NOT NULL DEFAULT 0,
            extracto_entradas NUMERIC(16, 2) NOT NULL DEFAULT 0,
            extracto_salidas NUMERIC(16, 2) NOT NULL DEFAULT 0,
            extracto_saldo_final NUMERIC(16, 2) NOT NULL DEFAULT 0,
            
            sistema_entradas NUMERIC(16, 2) DEFAULT 0,
            sistema_salidas NUMERIC(16, 2) DEFAULT 0,
            sistema_saldo_final NUMERIC(16, 2) DEFAULT 0, 
            
            diferencia_saldo NUMERIC(16, 2) GENERATED ALWAYS AS (sistema_saldo_final - extracto_saldo_final) STORED,
        
            datos_extra JSONB DEFAULT '{}', 
            
            estado VARCHAR(20) DEFAULT 'PENDIENTE', 
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_conciliacion ON conciliaciones (cuenta_id, year, month);
        """
        
        cursor.execute(sql)
        conn.commit()
        print("Table 'conciliaciones' created successfully.")
        
    except Exception as e:
        conn.rollback()
        print(f"Error creating table: {e}")
        raise e
    finally:
        pool.putconn(conn)
        pool.closeall()

if __name__ == "__main__":
    create_table()
