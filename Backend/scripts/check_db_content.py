import sys
import os
import psycopg2

# Adjust path to include backend root
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from src.infrastructure.database.connection import get_db_connection

def check_db_content():
    print("Verificando contenido de base de datos...")
    
    conn_gen = get_db_connection()
    conn = next(conn_gen)
    
    try:
        cursor = conn.cursor()
        
        # 1. List Tables
        print("\nTABLAS EN PUBLIC:")
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
        tables = cursor.fetchall()
        for t in tables:
            print(f"   - {t[0]}")
            
        # 2. Check catalogs
        print("\nREVISANDO CATALOGOS:")
        
        try:
            cursor.execute("SELECT count(*) FROM cuentas;")
            print(f"   - Cuentas: {cursor.fetchone()[0]}")
        except: print("   - Error reading cuentas")

        try:
            cursor.execute("SELECT count(*) FROM terceros;")
            print(f"   - Terceros: {cursor.fetchone()[0]}")
        except: print("   - Error reading terceros")
        
        try:
            cursor.execute("SELECT count(*) FROM centro_costos;")
            print(f"   - Centros Costo/Grupos: {cursor.fetchone()[0]}")
        except: print("   - Error reading centro_costos")
        
        try:
            cursor.execute("SELECT count(*) FROM conceptos;")
            print(f"   - Conceptos: {cursor.fetchone()[0]}")
        except: print("   - Error reading conceptos")

        # 3. Check Rules
        print("\nREVISANDO REGLAS:")
        
        # Reglas Clasificacion
        if any(t[0] == 'reglas_clasificacion' for t in tables):
            cursor.execute("SELECT count(*) FROM reglas_clasificacion;")
            print(f"   - reglas_clasificacion count: {cursor.fetchone()[0]}")
        else:
            print("   - Tabla 'reglas_clasificacion' NO EXISTE")
            
        # Matching Alias
        if any(t[0] == 'matching_alias' for t in tables):
            cursor.execute("SELECT count(*) FROM matching_alias;")
            print(f"   - matching_alias count: {cursor.fetchone()[0]}")
            
            # Show columns
            cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'matching_alias';")
            print("   - Columns matching_alias:", cursor.fetchall())

            # Show sample
            cursor.execute("SELECT * FROM matching_alias LIMIT 5;")
            print("   - Sample matching_alias:", cursor.fetchall())
        else:
             print("   - Tabla 'matching_alias' NO EXISTE")

    except Exception as e:
        print(f"\nError: {e}")
    finally:
        cursor.close()

if __name__ == "__main__":
    check_db_content()
