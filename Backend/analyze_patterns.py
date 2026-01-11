
import sys
import os
sys.path.append(os.getcwd())

import psycopg2
from src.infrastructure.database.connection import DB_CONFIG

def analyze_unclassified():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Find frequent descriptions in unclassified movements
        # Using UPPER to group similar ones
        query = """
            SELECT 
                UPPER(Descripcion) as desc_upper,
                COUNT(*) as frecuencia,
                SUM(ABS(Valor)) as volumen_total,
                MIN(Descripcion) as ejemplo
            FROM movimientos
            WHERE GrupoID IS NULL OR ConceptoID IS NULL
            GROUP BY UPPER(Descripcion)
            HAVING COUNT(*) > 1
            ORDER BY frecuencia DESC, volumen_total DESC
            LIMIT 20
        """
        
        cur.execute(query)
        rows = cur.fetchall()
        
        print("\nTOP 20 FREQUENT UNCLASSIFIED DESCRIPTIONS:")
        print(f"{'Count':<8} {'Total Vol':<15} {'Description Example'}")
        print("-" * 60)
        for row in rows:
            desc = row[3][:50] if row[3] else "Totalmente vacío"
            count = row[1]
            vol = row[2]
            print(f"{count:<8} ${vol:,.2f}       {desc}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_unclassified()
