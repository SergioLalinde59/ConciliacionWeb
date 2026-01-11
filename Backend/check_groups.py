
import sys
import os
sys.path.append(os.getcwd())

import psycopg2
from src.infrastructure.database.connection import DB_CONFIG

def check_groups():
    try:
        print("Connecting to DB...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        print("Fetching groups...")
        cur.execute("SELECT grupoid, grupo, es_traslado FROM grupos ORDER BY grupo")
        rows = cur.fetchall()
        print("Existing Groups:")
        print(f"{'ID':<5} {'Name':<30} {'IsTransfer'}")
        print("-" * 50)
        for row in rows:
            is_transfer = row[2] if len(row) > 2 else 'N/A'
            print(f"{row[0]:<5} {row[1]:<30} {is_transfer}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_groups()
