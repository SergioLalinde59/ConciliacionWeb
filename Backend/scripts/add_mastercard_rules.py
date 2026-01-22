import sys
import os

# Adjust path to include backend root
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from src.infrastructure.database.connection import get_db_connection

def find_mastercard_and_add_rules():
    print("🚀 Buscando 'Mastercard' en la base de datos...")
    
    conn_gen = get_db_connection()
    conn = next(conn_gen)
    
    try:
        cursor = conn.cursor()
        
        # 1. Buscar Tercero
        cursor.execute("SELECT terceroid, tercero FROM terceros WHERE tercero ILIKE '%Master%'")
        rows = cursor.fetchall()
        
        tercero_id = None
        tercero_nombre = None
        
        if not rows:
            print("❌ No se encontró ningún tercero con 'Master'.")
            return
        
        print("\nResultados encontrados:")
        for r in rows:
            print(f"ID: {r[0]} - Nombre: {r[1]}")
            if "MASTERCARD" in r[1].upper():
                tercero_id = r[0]
                tercero_nombre = r[1]
        
        if not tercero_id and len(rows) == 1:
            tercero_id = rows[0][0]
            tercero_nombre = rows[0][1]
            
        if not tercero_id:
            print(f"\n⚠️ Múltiples coincidencias y ninguna es exacta 'MASTERCARD'. Usando la primera: {rows[0][1]} (ID {rows[0][0]})")
            tercero_id = rows[0][0]
            tercero_nombre = rows[0][1]
        else:
            print(f"\n✅ Tercero Seleccionado: {tercero_nombre} (ID {tercero_id})")

        # 2. Insertar Reglas
        # Regla 1: MASTER PESOS
        patron1 = "MASTER PESOS"
        # Regla 2: MASTER DOLAR
        patron2 = "MASTER DOLAR"
        # Regla 3: TC MASTER (Para cubrir ambos si formato cambia)
        patron3 = "TC MASTER"

        reglas_a_insertar = [patron1, patron2, patron3]
        
        print(f"\nInsertando reglas para '{tercero_nombre}'...")
        
        for patron in reglas_a_insertar:
            # Verificar si existe
            cursor.execute("SELECT id FROM reglas_clasificacion WHERE patron = %s", (patron,))
            if cursor.fetchone():
                print(f"⚠️ La regla '{patron}' ya existe. Saltando.")
            else:
                # Insertar
                cursor.execute("""
                    INSERT INTO reglas_clasificacion (patron, tipo_match, tercero_id, centro_costo_id, concepto_id)
                    VALUES (%s, 'contiene', %s, NULL, NULL)
                """, (patron, tercero_id))
                print(f"✅ Regla insertada: Pattern='{patron}' -> TerceroID={tercero_id}")
        
        conn.commit()
        print("\n🏁 Proceso finalizado exitosamente.")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")
    finally:
        cursor.close()
        # Return connection to pool (handled by context manager usually but here manual)
        # In this script using generator manually, so we just verify usage.
        pass

if __name__ == "__main__":
    find_mastercard_and_add_rules()
