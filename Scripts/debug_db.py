
import sys
import os
import json

# Add Backend to python path
sys.path.append(os.path.join(os.getcwd(), 'Backend'))

from src.infrastructure.database.connection import get_connection_pool

def check_db():
    try:
        pool = get_connection_pool()
        conn = pool.getconn()
        cursor = conn.cursor()
        
        # Check counts
        cursor.execute("SELECT count(*) FROM conciliaciones")
        count = cursor.fetchone()[0]
        print(f"Total rows in conciliaciones: {count}")
        
        # Check distinct periods
        cursor.execute("""
            SELECT year, month, count(*) 
            FROM conciliaciones 
            GROUP BY year, month 
            ORDER BY year DESC, month DESC
        """)
        rows = cursor.fetchall()
        print("\nPeriods found:")
        for r in rows:
            print(f"Year: {r[0]}, Month: {r[1]}, Count: {r[2]}")
            
        # Check sample records
        cursor.execute("SELECT id, cuenta_id, year, month, estado FROM conciliaciones LIMIT 5")
        rows = cursor.fetchall()
        print("\nSample records:")
        for r in rows:
            print(r)
            
        pool.putconn(conn)
        pool.closeall()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_db()
