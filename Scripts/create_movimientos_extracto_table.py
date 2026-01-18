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
        CREATE TABLE IF NOT EXISTS movimientos_extracto (
            id SERIAL PRIMARY KEY,
            
            -- Relación con cuenta (viene del parámetro al cargar el extracto)
            cuenta_id INTEGER NOT NULL REFERENCES cuentas(cuentaid),
            
            -- Periodo de conciliación
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            
            -- Datos del movimiento del extracto
            fecha DATE NOT NULL,
            descripcion TEXT NOT NULL,
            referencia VARCHAR(255),
            valor NUMERIC(16, 2) NOT NULL,
            
            -- Metadata de origen
            numero_linea INTEGER,
            raw_text TEXT,
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            -- Constraint de FK a conciliaciones
            CONSTRAINT fk_conciliacion 
                FOREIGN KEY (cuenta_id, year, month) 
                REFERENCES conciliaciones(cuenta_id, year, month)
                ON DELETE CASCADE
        );
        
        -- Índices
        CREATE INDEX IF NOT EXISTS idx_mov_extracto_cuenta_periodo 
            ON movimientos_extracto(cuenta_id, year, month);
            
        CREATE INDEX IF NOT EXISTS idx_mov_extracto_fecha 
            ON movimientos_extracto(fecha);
            
        CREATE INDEX IF NOT EXISTS idx_mov_extracto_valor 
            ON movimientos_extracto(valor);
            
        CREATE INDEX IF NOT EXISTS idx_mov_extracto_referencia 
            ON movimientos_extracto(referencia) 
            WHERE referencia IS NOT NULL;
            
        -- Comentarios
        COMMENT ON TABLE movimientos_extracto IS 'Movimientos individuales extraídos de PDFs de extractos bancarios';
        COMMENT ON COLUMN movimientos_extracto.cuenta_id IS 'ID de cuenta - viene del parámetro al cargar extracto en frontend';
        COMMENT ON COLUMN movimientos_extracto.year IS 'Año del periodo - extraído del PDF';
        COMMENT ON COLUMN movimientos_extracto.month IS 'Mes del periodo - extraído del PDF';
        """
        
        cursor.execute(sql)
        conn.commit()
        print("✅ Table 'movimientos_extracto' created successfully.")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error creating table: {e}")
        raise e
    finally:
        pool.putconn(conn)
        pool.closeall()
if __name__ == "__main__":
    create_table()