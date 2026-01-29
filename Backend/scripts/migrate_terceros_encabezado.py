import os
import psycopg2
from dotenv import load_dotenv

# Cargar variables de entorno desde el directorio backend
# Subir un nivel desde scripts si fuera necesario, pero asumimos ejecución desde la raíz o backend
load_dotenv(dotenv_path='backend/.env')

def migrate_terceros():
    conn = None
    try:
        # Configuración desde .env
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5433'),
            database=os.getenv('DB_NAME', 'Mvtos'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD')
        )
        cur = conn.cursor()

        print("--- PASO 1: SINCRONIZACIÓN DE TERCEROS AL ENCABEZADO ---")
        
        # 1. Contar cuántos registros están sin tercero en el encabezado
        cur.execute("SELECT COUNT(*) FROM movimientos_encabezado WHERE terceroid IS NULL")
        count_nulls = cur.fetchone()[0]
        print(f"Movimientos con terceroid NULL en encabezado: {count_nulls}")

        if count_nulls == 0:
            print("No hay registros pendientes de sincronización inicial.")
        else:
            # 2. Ejecutar la actualización masiva
            # Tomamos el TerceroID del primer detalle que encontremos para cada encabezado
            update_query = """
                UPDATE movimientos_encabezado m
                SET terceroid = (
                    SELECT md.TerceroID 
                    FROM movimientos_detalle md 
                    WHERE md.movimiento_id = m.Id 
                    AND md.TerceroID IS NOT NULL
                    LIMIT 1
                )
                WHERE m.terceroid IS NULL;
            """
            cur.execute(update_query)
            affected = cur.rowcount
            print(f"Registros actualizados: {affected}")

        # 3. Verificar si aún quedan NULLs (podrían ser movimientos sin detalles)
        cur.execute("SELECT COUNT(*) FROM movimientos_encabezado WHERE terceroid IS NULL")
        remaining_nulls = cur.fetchone()[0]
        if remaining_nulls > 0:
            print(f"AVISO: Aún existen {remaining_nulls} movimientos sin tercero (posiblemente sin detalles o detalles sin tercero).")

        conn.commit()
        print("✅ Migración de datos completada exitosamente.")

    except Exception as e:
        print(f"❌ Error durante la migración: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    migrate_terceros()
