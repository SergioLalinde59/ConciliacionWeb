import sys
import os

# Adjust path to include backend root
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from src.infrastructure.database.connection import get_db_connection

def fix_mastercard_rules():
    print("🚀 Corrigiendo Reglas Mastercard...")
    
    conn_gen = get_db_connection()
    conn = next(conn_gen)
    
    try:
        cursor = conn.cursor()
        
        # 1. Eliminar regla ambigua 'TC MASTER'
        print("🗑️ Eliminando regla ambigua 'TC MASTER'...")
        cursor.execute("DELETE FROM reglas_clasificacion WHERE patron = 'TC MASTER'")
        deleted = cursor.rowcount
        print(f"   Eliminadas: {deleted}")
        
        # 2. Actualizar/Insertar 'MASTER PESOS' -> 160 (COP)
        print("🛠️ Configurando 'MASTER PESOS' -> 160 (COP)...")
        # Upsert logic (Delete + Insert or Update)
        cursor.execute("DELETE FROM reglas_clasificacion WHERE patron = 'MASTER PESOS'")
        cursor.execute("""
            INSERT INTO reglas_clasificacion (patron, tipo_match, tercero_id)
            VALUES ('MASTER PESOS', 'contiene', 160)
        """)
        print("   ✅ Regla 'MASTER PESOS' configurada.")

        # 3. Actualizar/Insertar 'MASTER DOLAR' -> 161 (USD)
        print("🛠️ Configurando 'MASTER DOLAR' -> 161 (USD)...")
        cursor.execute("DELETE FROM reglas_clasificacion WHERE patron = 'MASTER DOLAR'")
        cursor.execute("""
            INSERT INTO reglas_clasificacion (patron, tipo_match, tercero_id)
            VALUES ('MASTER DOLAR', 'contiene', 161)
        """)
        print("   ✅ Regla 'MASTER DOLAR' configurada.")
        
        conn.commit()
        print("\n🏁 Reglas corregidas exitosamente.")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")
    finally:
        cursor.close()

if __name__ == "__main__":
    fix_mastercard_rules()
