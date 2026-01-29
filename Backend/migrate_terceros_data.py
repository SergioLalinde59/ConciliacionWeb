import psycopg2
import os

def migrate_terceros():
    try:
        conn = psycopg2.connect(
            dbname=os.getenv('DB_NAME', 'Mvtos'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'SLB'),
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432') # Use standard if local
        )
        cursor = conn.cursor()
        
        # 1. Check how many records need update
        check_query = """
            SELECT COUNT(*) 
            FROM movimientos_encabezado m
            WHERE m.terceroid IS NULL
            AND EXISTS (SELECT 1 FROM movimientos_detalle md WHERE md.movimiento_id = m.Id AND md.TerceroID IS NOT NULL)
        """
        cursor.execute(check_query)
        to_update = cursor.fetchone()[0]
        print(f"Records to migrate: {to_update}")
        
        if to_update > 0:
            # 2. Perform migration
            # We take the TerceroID from the first detail (lowest id) for each header that has it NULL
            migrate_query = """
                UPDATE movimientos_encabezado m
                SET terceroid = (
                    SELECT md.TerceroID 
                    FROM movimientos_detalle md 
                    WHERE md.movimiento_id = m.Id 
                    AND md.TerceroID IS NOT NULL
                    ORDER BY md.id ASC
                    LIMIT 1
                )
                WHERE m.terceroid IS NULL
                AND EXISTS (
                    SELECT 1 
                    FROM movimientos_detalle md 
                    WHERE md.movimiento_id = m.Id 
                    AND md.TerceroID IS NOT NULL
                )
            """
            cursor.execute(migrate_query)
            updated = cursor.rowcount
            print(f"Successfully migrated {updated} records.")
            conn.commit()
        else:
            print("No action needed.")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error during migration: {e}")

if __name__ == "__main__":
    migrate_terceros()
