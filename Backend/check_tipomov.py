import sys
import os

# Add the src directory to the python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.infrastructure.database.connection import get_db_connection

def check_tipomov():
    print("Initializing connection...")
    # Consume generator
    gen = get_db_connection()
    conn = next(gen)
    cursor = conn.cursor()
    
    print("Checking 'tipomov' table...")
    
    try:
        # Check total count
        cursor.execute("SELECT COUNT(*) FROM tipomov")
        total = cursor.fetchone()[0]
        print(f"Total records: {total}")
        
        # Check active records
        cursor.execute("SELECT COUNT(*) FROM tipomov WHERE activa = TRUE")
        active = cursor.fetchone()[0]
        print(f"Active records: {active}")
        
        # List all records
        cursor.execute("SELECT tipomovid, tipomov, activa FROM tipomov")
        rows = cursor.fetchall()
        print("\nAll Records:")
        print(f"{'ID':<5} {'Nombre':<20} {'Activa':<10}")
        print("-" * 40)
        for row in rows:
            print(f"{row[0]:<5} {row[1]:<20} {row[2]:<10}")
            
    except Exception as e:
        print(f"Error querying table: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    check_tipomov()
