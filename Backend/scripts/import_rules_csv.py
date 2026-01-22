import sys
import os
import csv
import pandas as pd

# Adjust path to include backend root
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from src.infrastructure.database.connection import get_db_connection

def import_csv_rules():
    csv_path = os.path.join(backend_dir, '..', 'Maestros', '2026-01-15 reglas.csv')
    print(f"Leyendo CSV desde: {csv_path}")
    
    try:
        df = pd.read_csv(csv_path)
        print(f"Encontradas {len(df)} reglas en CSV")
        
        conn_gen = get_db_connection()
        conn = next(conn_gen)
        cursor = conn.cursor()
        
        inserted = 0
        for _, row in df.iterrows():
            patron = row['Patrón']
            tercero_id = row['Tercero ID'] if pd.notna(row['Tercero ID']) else None
            centro_costo_id = row['Centro Costo ID'] if pd.notna(row['Centro Costo ID']) else None
            concepto_id = row['Concepto ID'] if pd.notna(row['Concepto ID']) else None
            
            # Check if exists
            cursor.execute("SELECT 1 FROM reglas_clasificacion WHERE patron = %s", (patron,))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO reglas_clasificacion (patron, third_party_pattern_source, tercero_id, centro_costo_id, concepto_id, tipo_match)
                    VALUES (%s, 'CSV Import', %s, %s, %s, 'contiene')
                """, (patron, tercero_id, centro_costo_id, concepto_id))
                # Note: `third_party_pattern_source` might not exist in schema if I just recreated it standardly.
                # Actually, my create script used: patron, descripcion, tercero_id, centro_costo_id, concepto_id, tipo_match
                # I should use that schema.
                
        # Re-try insert with correct schema
        pass 

    except Exception as e:
        print(f"Error reading CSV: {e}")

def import_csv_rules_v2():
    csv_path = os.path.join(backend_dir, '..', 'Maestros', '2026-01-15 reglas.csv')
    conn_gen = get_db_connection()
    conn = next(conn_gen)
    cursor = conn.cursor()
    
    try:
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                patron = row['Patrón']
                tercero_id = row['Tercero ID'] or None
                cc_id = row['Centro Costo ID'] or None
                conc_id = row['Concepto ID'] or None
                
                # Insert
                try:
                    cursor.execute("""
                        INSERT INTO reglas_clasificacion (patron, tercero_id, centro_costo_id, concepto_id, tipo_match)
                        VALUES (%s, %s, %s, %s, 'contiene')
                        ON CONFLICT (id) DO NOTHING
                    """, (patron, tercero_id, cc_id, conc_id))
                    count += 1
                except Exception as ex:
                    print(f"Error inserting {patron}: {ex}")
                    conn.rollback()
                    
            conn.commit()
            print(f"Importadas {count} reglas.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    import_csv_rules_v2()
