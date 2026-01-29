
import os
import psycopg2

def check_detalle_schema():
    host = os.environ.get("DB_HOST", "localhost")
    dbname = os.environ.get("DB_NAME", "Mvtos")
    user = os.environ.get("DB_USER", "postgres")
    password = os.environ.get("DB_PASSWORD", "postgres")
    port = os.environ.get("DB_PORT", "5432")

    try:
        conn = psycopg2.connect(
            host=host,
            database=dbname,
            user=user,
            password=password,
            port=port
        )
        cursor = conn.cursor()
        
        print("Checking movimientos_detalle columns:")
        cursor.execute("""
            SELECT column_name, ordinal_position
            FROM information_schema.columns
            WHERE table_name = 'movimientos_detalle'
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()
        for col in columns:
            print(f"{col[1]}: {col[0]}")
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_detalle_schema()
