import psycopg2
import sys

conn = psycopg2.connect(host='localhost', port=5433, database='Mvtos', user='postgres', password='SLB')
cur = conn.cursor()

print("--- LIMPIEZA Y DIAGNÓSTICO ---")

# 1. Eliminar movimiento de prueba (ID 2154)
print("\n1. Eliminando movimiento de prueba del sistema (ID 2154)...")
# Primero borrar vinculacón
cur.execute("DELETE FROM movimiento_vinculaciones WHERE movimiento_sistema_id = 2154")
# Luego borrar movimiento
cur.execute("DELETE FROM movimientos WHERE id = 2154")
print(f"   Movimiento eliminado. Rows affected: {cur.rowcount}")
conn.commit()

# 2. Diagnóstico de los extractos de $2M (1725, 1726)
ids = [1725, 1726]
print(f"\n2. Estado de Extractos problemáticos {ids}:")

cur.execute(f"""
    SELECT 
        me.id, 
        me.fecha, 
        me.valor, 
        me.descripcion,
        mv.id as vinculacion_id,
        mv.movimiento_sistema_id,
        m.descripcion as sistema_desc
    FROM movimientos_extracto me
    LEFT JOIN movimiento_vinculaciones mv ON me.id = mv.movimiento_extracto_id
    LEFT JOIN movimientos m ON mv.movimiento_sistema_id = m.id
    WHERE me.id = ANY(%s)
""", (ids,))

rows = cur.fetchall()
for r in rows:
    match_status = f"Vinculado a Sistema {r[5]} ({r[6]})" if r[5] else "SIN MATCH (Libre)"
    print(f"   Ext {r[0]} | {r[1]} | ${r[2]:,.0f} | {r[3][:30]}...")
    print(f"      Estado: {match_status}")

# 3. Buscar si existe algún movimiento del sistema 'candidato' (orphaned o no)
print("\n3. Buscando movimientos candidatos en sistema ($2.000.000, Dic 2025):")
cur.execute("""
    SELECT id, fecha, descripcion, valor, created_at 
    FROM movimientos 
    WHERE cuentaid = 1 
      AND valor = -2000000 
      AND EXTRACT(YEAR FROM fecha) = 2025 
      AND EXTRACT(MONTH FROM fecha) = 12
""")
candidatos = cur.fetchall()
for c in candidatos:
    # Ver si está vinculado
    cur.execute("SELECT movimiento_extracto_id FROM movimiento_vinculaciones WHERE movimiento_sistema_id = %s", (c[0],))
    vincs = cur.fetchall()
    estado = f"Vinculado a {len(vincs)} extractos: {[v[0] for v in vincs]}" if vincs else "LIBRE (Sin extracto)"
    print(f"   Sis {c[0]} | {c[1]} | {c[2][:30]}... | {estado}")

conn.close()
