
import psycopg2
import os

DB_CONFIG = {
    'host': 'localhost',
    'port': '5433',
    'database': 'Mvtos',
    'user': 'postgres',
    'password': 'SLB'
}

def read_movimientos():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("\nFetching data from 'movimientos' table (Limiting to first 50 rows for display)...")
        # Get column names first
        cursor.execute("SELECT * FROM movimientos LIMIT 0")
        colnames = [desc[0] for desc in cursor.description]
        
        # Select data with a limit to avoid console flooding
        cursor.execute("SELECT * FROM movimientos ORDER BY id LIMIT 50")
        rows = cursor.fetchall()
        
        # Get total count
        cursor.execute("SELECT COUNT(*) FROM movimientos")
        total_count = cursor.fetchone()[0]
        
        if not rows:
             print("Table 'movimientos' is empty.")
        else:
             # Print header
             print(" | ".join([f"{col:<15}" for col in colnames]))
             print("-" * (18 * len(colnames)))
             
             # Print rows
             for r in rows:
                 # Convert all to string for safe printing, handle None
                 row_str = [str(val) if val is not None else "NULL" for val in r]
                 # Truncate long strings for display
                 row_str = [val[:15] + ".." if len(val) > 15 else val for val in row_str]
                 print(" | ".join([f"{val:<15}" for val in row_str]))
            
        print(f"\nShowing {len(rows)} of {total_count} total rows.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    read_movimientos()
