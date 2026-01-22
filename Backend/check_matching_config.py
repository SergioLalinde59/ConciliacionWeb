
import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.infrastructure.database.connection import get_db_connection
from src.infrastructure.database.postgres_configuracion_matching_repository import PostgresConfiguracionMatchingRepository

def check_config():
    print("Connecting to database...")
    try:
        gen = get_db_connection()
        conn = next(gen)
        print("Connected.")
        
        repo = PostgresConfiguracionMatchingRepository(conn)
        print("Fetching active configuration...")
        try:
            config = repo.obtener_activa()
            print("\n" + "="*50)
            print(f"ACTIVE MATCHING CONFIGURATION (ID: {config.id})")
            print("="*50)
            print(f"Weights:")
            print(f"  - Date:        {config.peso_fecha}")
            print(f"  - Value:       {config.peso_valor}")
            print(f"  - Description: {config.peso_descripcion}")
            print("-" * 30)
            print(f"Thresholds:")
            print(f"  - Exact Match:    {config.score_minimo_exacto}")
            print(f"  - Probable Match: {config.score_minimo_probable}")
            print("-" * 30)
            print(f"Tolerances:")
            print(f"  - Value:          ${config.tolerancia_valor}")
            print(f"  - Desc Min Sim:   {config.similitud_descripcion_minima}")
            print("="*50 + "\n")
            
        except ValueError as e:
            print(f"Error fetching config: {e}")
        except Exception as e:
            print(f"Unexpected error: {e}")
        finally:
            try:
                # Release connection back to pool
                next(gen)
            except StopIteration:
                pass
            except Exception:
                pass
                
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    check_config()
