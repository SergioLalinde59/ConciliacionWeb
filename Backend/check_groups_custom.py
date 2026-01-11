
import psycopg2
import os

DB_CONFIG = {
    'host': 'localhost',
    'port': '5433',
    'database': 'Mvtos',
    'user': 'postgres',
    'password': 'SLB'
}

def check_groups():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        cursor.execute("SELECT grupoid, grupo, activa FROM grupos WHERE grupoid IN (35, 46, 47)")
        rows = cursor.fetchall()
        
        print(f"{'ID':<5} {'Grupo':<20} {'Activa':<10}")
        print("-" * 40)
        for r in rows:
            print(f"{r[0]:<5} {r[1]:<20} {r[2]}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    check_groups()
