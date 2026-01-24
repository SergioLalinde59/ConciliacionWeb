import psycopg2
import sys
import os

# Configuración de conexión manual para replicar entorno
conn = psycopg2.connect(host='localhost', port=5433, database='Mvtos', user='postgres', password='SLB')
cur = conn.cursor()

CUENTA_ID = 1
YEAR = 2025
MONTH = 12

print(f"--- DEBUGGING INVALIDACIONES ({MONTH}/{YEAR}) ---")

# 1. Simular DETECTAR
print("\n1. Detectando casos...")
query_detectar = """
    SELECT 
        m.id as sistema_id,
        COUNT(mv.id) as num_vinculaciones
    FROM movimientos m
    JOIN movimiento_vinculaciones mv ON m.id = mv.movimiento_sistema_id
    WHERE m.cuentaid = %s
      AND EXTRACT(YEAR FROM m.fecha) = %s
      AND EXTRACT(MONTH FROM m.fecha) = %s
    GROUP BY m.id
    HAVING COUNT(mv.id) > 1
"""
cur.execute(query_detectar, (CUENTA_ID, YEAR, MONTH))
casos = cur.fetchall()
print(f"   Encontrados {len(casos)} casos problemáticos")
ids_a_borrar = [c[0] for c in casos]
print(f"   IDs de Sistema a limpiar: {ids_a_borrar}")

if not ids_a_borrar:
    print("   ❌ No hay nada que borrar. Abortando.")
    sys.exit()

# 2. Verificar antes de borrar
print("\n2. Estado ANTES de delete:")
for sys_id in ids_a_borrar:
    cur.execute("SELECT id, movimiento_extracto_id FROM movimiento_vinculaciones WHERE movimiento_sistema_id = %s", (sys_id,))
    links = cur.fetchall()
    print(f"   Sistema {sys_id}: {len(links)} vinculaciones -> {[l[1] for l in links]}")

# 3. Intentar BORRAR
print("\n3. Ejecutando DELETE...")
delete_query = """
    DELETE FROM movimiento_vinculaciones
    WHERE movimiento_sistema_id = ANY(%s)
"""
try:
    cur.execute(delete_query, (ids_a_borrar,))
    deleted = cur.rowcount
    print(f"   ✅ Rows deleted: {deleted}")
    
    # Commit explícito
    conn.commit()
    print("   ✅ Commit ejecutado")
except Exception as e:
    print(f"   ❌ Error en delete: {e}")
    conn.rollback()

# 4. Verificar DESPUES
print("\n4. Estado DESPUES de delete:")
for sys_id in ids_a_borrar:
    cur.execute("SELECT id FROM movimiento_vinculaciones WHERE movimiento_sistema_id = %s", (sys_id,))
    links = cur.fetchall()
    print(f"   Sistema {sys_id}: {len(links)} vinculaciones restantes")

conn.close()
