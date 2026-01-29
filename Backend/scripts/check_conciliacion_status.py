import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'host.docker.internal'),
    'port': os.getenv('DB_PORT', '5433'),
    'database': os.getenv('DB_NAME', 'Mvtos'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'SLB')
}

def check_period():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        query = "SELECT cuenta_id, year, month, estado FROM conciliaciones WHERE cuenta_id = 3 AND year = 2026 AND month = 1;"
        cursor.execute(query)
        rows = cursor.fetchall()
        
        if not rows:
            print("No record found for cuenta_id 3, 2026, month 1")
        else:
            for row in rows:
                print(f"Cuenta: {row[0]}, Year: {row[1]}, Month: {row[2]}, Estado: {row[3]}")
                
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_period()
