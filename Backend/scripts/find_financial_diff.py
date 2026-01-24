import psycopg2

conn = psycopg2.connect(host='localhost', port=5433, database='Mvtos', user='postgres', password='SLB')
cur = conn.cursor()

print("--- BUSCANDO EL DESCUADRE DE $2 PESOS ---")

cur.execute("""
    SELECT 
        me.id as ext_id,
        m.id as sis_id,
        me.valor as val_ext,
        m.valor as val_sis,
        (me.valor - m.valor) as diferencia,
        me.descripcion
    FROM movimiento_vinculaciones mv
    JOIN movimientos_extracto me ON mv.movimiento_extracto_id = me.id
    JOIN movimientos m ON mv.movimiento_sistema_id = m.id
    WHERE me.valor != m.valor
""")

rows = cur.fetchall()

if not rows:
    print("✅ No se encontraron diferencias exactas valor vs valor.")
    print("Posibilidad: ¿Hay movimientos NO vinculados que suman en el total?")
else:
    print(f"⚠️ Se encontraron {len(rows)} diferencias:")
    total_diff = 0
    for r in rows:
        diff = r[4]
        total_diff += diff
        # print(f"   Ext {r[0]} (${r[2]}) vs Sis {r[1]} (${r[3]}) | Dif: ${diff}")
    
    print(f"\nTOTAL DIFERENCIA ACUMULADA: ${total_diff:.2f}")

conn.close()
