import sys
import os

# Add the src directory to the python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.infrastructure.database.connection import get_db_connection

def fix_tipomov_schema():
    print("Initializing connection...")
    # Consume generator
    gen = get_db_connection()
    conn = next(gen)
    cursor = conn.cursor()
    
    print("Fixing 'tipomov' table schema...")
    
    try:
        # Add column if not exists
        cursor.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='tipomov' AND column_name='activa') THEN
                    ALTER TABLE tipomov ADD COLUMN activa BOOLEAN DEFAULT TRUE;
                    RAISE NOTICE 'Column activa added to tipomov';
                END IF;
            END $$;
        """)
        
        # Update existing records
        cursor.execute("UPDATE tipomov SET activa = TRUE WHERE activa IS NULL")
        updated = cursor.rowcount
        print(f"Updated {updated} records to have active = TRUE")
        
        conn.commit()
        print("Schema update completed successfully.")
            
    except Exception as e:
        conn.rollback()
        print(f"Error updating schema: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    fix_tipomov_schema()
