
import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.infrastructure.database.connection import get_db_connection

def check_dates():
    try:
        gen = get_db_connection()
        conn = next(gen)
        cursor = conn.cursor()
        
        # 1. Get Config Dates
        cursor.execute("SELECT updated_at, peso_fecha, peso_valor, peso_descripcion FROM configuracion_matching WHERE activo = TRUE")
        config_row = cursor.fetchone()
        
        # 2. Get Specific Match Date (Using description snippet)
        cursor.execute("""
            SELECT v.created_at, v.score_similitud, v.fecha_confirmacion,
                   me.descripcion as nom_extracto, m.descripcion as nom_sistema
            FROM movimiento_vinculaciones v 
            JOIN movimientos_extracto me ON v.movimiento_extracto_id = me.id 
            LEFT JOIN movimientos m ON v.movimiento_sistema_id = m.id
            WHERE me.descripcion LIKE '%RETIRO CAJERO VIVA LA CEJA%'
            LIMIT 1
        """)
        match_row = cursor.fetchone()
        
        print("\n=== INVESTIGATION REPORT ===")
        if config_row:
            print(f"Current Config Updated At: {config_row[0]}")
            print(f"Current Weights: D={config_row[1]}, V={config_row[2]}, Desc={config_row[3]}")
        else:
            print("ERROR: No active configuration found.")
            
        print("-" * 30)
        
        if match_row:
            print(f"Match Found: '{match_row[3]}' vs '{match_row[4]}'")
            print(f"Match Created At:        {match_row[0]}")
            print(f"Match Score Stored:      {match_row[1]} (88% = 0.88?)")
            
            # Simple logic check
            created = match_row[0]
            config_updated = config_row[0]
            
            if created and config_updated:
                if created < config_updated:
                    print("\nCONCLUSION: The match is OLDER than the current configuration.")
                    print("The 88% score was calculated with PREVIOUS weights.")
                else:
                    print("\nCONCLUSION: The match is NEWER than the configuration.")
                    print("This is strange. Review needed.")
        else:
            print("Match not found in DB with that description.")
            
    except Exception as e:
        with open("debug_output_timestamps.txt", "w") as f:
            f.write(f"Error: {e}")
    finally:
        try:
             # Release connection
            next(gen)
        except:
             pass

if __name__ == "__main__":
    # Redirect stdout to file
    import sys
    sys.stdout = open("debug_output_timestamps.txt", "w")
    check_dates()
    sys.stdout.close()
