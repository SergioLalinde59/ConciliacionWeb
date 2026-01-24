import psycopg2

conn = psycopg2.connect(host='localhost', port=5433, database='Mvtos', user='postgres', password='SLB')
cur = conn.cursor()

print("--- DIAGNÓSTICO FINAL $2M ---")

ids = [1725, 1726]

cur.execute(f"""
    SELECT 
        me.id, 
        me.descripcion,
        me.valor,
        mv.id as match_id,
        mv.movimiento_sistema_id,
        m.id as sist_id,
        m.descripcion as sist_desc
    FROM movimientos_extracto me
    LEFT JOIN movimiento_vinculaciones mv ON me.id = mv.movimiento_extracto_id
    LEFT JOIN movimientos m ON mv.movimiento_sistema_id = m.id
    WHERE me.id = ANY(%s)
""", (ids,))

rows = cur.fetchall()
for r in rows:
    print(f"Ext {r[0]} | Desc: {r[1]} | Val: {r[2]}")
    if r[3]:
        print(f"   🔴 TIENE MATCH: ID {r[3]} -> Sistema {r[5]} ({r[6]})")
    else:
        print(f"   🟢 SIN MATCH (Debería salir con chulo azul)")

conn.close()
