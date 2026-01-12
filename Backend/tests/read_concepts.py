
import psycopg2
import os

DB_CONFIG = {
    'host': 'localhost',
    'port': '5433',
    'database': 'Mvtos',
    'user': 'postgres',
    'password': 'SLB'
}

def read_concepts():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("\nFetching all data from 'conceptos' table...")
        # Get column names first
        cursor.execute("SELECT * FROM conceptos LIMIT 0")
        colnames = [desc[0] for desc in cursor.description]
        
        # Select all data
        cursor.execute("SELECT * FROM conceptos ORDER BY conceptoid")
        rows = cursor.fetchall()
        
        if not rows:
             print("Table 'conceptos' is empty.")
        else:
             # Print header
             print(" | ".join([f"{col:<15}" for col in colnames]))
             print("-" * (18 * len(colnames)))
             
             # Print rows
             for r in rows:
                 # Convert all to string for safe printing
                 row_str = [str(val) for val in r]
                 print(" | ".join([f"{val:<15}" for val in row_str]))
            
        print(f"\nTotal rows: {len(rows)}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    read_concepts()
