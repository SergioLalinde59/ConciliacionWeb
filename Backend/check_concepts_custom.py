
import psycopg2
import os

DB_CONFIG = {
    'host': 'localhost',
    'port': '5433',
    'database': 'Mvtos',
    'user': 'postgres',
    'password': 'SLB'
}

def check_concepts():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("\nChecking Concepts for Groups 35 (Prestamos) and 46 (Tita):")
        cursor.execute("SELECT conceptoid, concepto, grupoid_fk FROM conceptos WHERE grupoid_fk IN (35, 46)")
        rows = cursor.fetchall()
        
        if not rows:
             print("NO CONCEPTS FOUND for these groups!")
        else:
             print(f"{'ID':<5} {'Concepto':<30} {'GrupoID':<10}")
             print("-" * 50)
             for r in rows:
                 print(f"{r[0]:<5} {r[1]:<30} {r[2]}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    check_concepts()
