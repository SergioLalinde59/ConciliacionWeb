import psycopg2
import os

def check_counts():
    try:
        conn = psycopg2.connect(
            dbname=os.getenv('DB_NAME', 'Mvtos'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'SLB'),
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5433')
        )
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM movimientos_encabezado")
        count_e = cursor.fetchone()[0]
        print(f"movimientos_encabezado rows: {count_e}")
        
        cursor.execute("SELECT COUNT(*) FROM movimientos_detalle")
        count_d = cursor.fetchone()[0]
        print(f"movimientos_detalle rows: {count_d}")
        
        cursor.execute("SELECT COUNT(*) FROM movimientos_encabezado WHERE terceroid IS NOT NULL")
        count_t = cursor.fetchone()[0]
        print(f"movimientos_encabezado with terceroid: {count_t}")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_counts()
