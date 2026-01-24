import psycopg2

conn = psycopg2.connect(host='localhost', port=5433, database='Mvtos', user='postgres', password='SLB')
cur = conn.cursor()

print("="*50)
print("ESTADO DEL TABLERO (VERDAD DE LA BD)")
print("="*50)

# 1. Analizar Extractos $30.000 (1730, 1731)
print("\n--- EXTRACTOS $30.000 ---")
cur.execute(f"""
    SELECT 
        me.id, me.fecha, me.valor, me.descripcion,
        mv.id as match_id, mv.estado,
        m.id as sis_id, m.descripcion as sis_desc, m.detalle
    FROM movimientos_extracto me
    LEFT JOIN movimiento_vinculaciones mv ON me.id = mv.movimiento_extracto_id
    LEFT JOIN movimientos m ON mv.movimiento_sistema_id = m.id
    WHERE me.id IN (1730, 1731)
""")
for r in cur.fetchall():
    status = f"✅ MATCH {r[5]} con Sistema {r[6]}" if r[4] else "⚪ SIN MATCH (Pendiente de acción)"
    print(f"Ext {r[0]} | {status}")
    if r[6]: print(f"    -> Sistema: {r[7]} ({r[8]})")

# 2. Analizar Extractos $2.000.000 (1725, 1726)
print("\n--- EXTRACTOS $2.000.000 ---")
cur.execute(f"""
    SELECT 
        me.id, me.fecha, me.valor, me.descripcion,
        mv.id as match_id, mv.estado,
        m.id as sis_id, m.descripcion as sis_desc, m.detalle
    FROM movimientos_extracto me
    LEFT JOIN movimiento_vinculaciones mv ON me.id = mv.movimiento_extracto_id
    LEFT JOIN movimientos m ON mv.movimiento_sistema_id = m.id
    WHERE me.id IN (1725, 1726)
""")
for r in cur.fetchall():
    status = f"✅ MATCH {r[5]} con Sistema {r[6]}" if r[4] else "⚪ SIN MATCH (Pendiente de acción)"
    print(f"Ext {r[0]} | {status}")
    if r[6]: print(f"    -> Sistema: {r[7]} ({r[8]})")

# 3. Verificar si hay movimientos del sistema 'sueltos' que podrían hacer match
print("\n--- MOVIMIENTOS SISTEMA SUELTOS CANDIDATOS ---")
cur.execute("""
    SELECT m.id, m.fecha, m.valor, m.descripcion
    FROM movimientos m
    LEFT JOIN movimiento_vinculaciones mv ON m.id = mv.movimiento_sistema_id
    WHERE m.cuentaid = 1 
      AND m.valor IN (-2000000, 30000)
      AND EXTRACT(YEAR FROM m.fecha) = 2025
      AND EXTRACT(MONTH FROM m.fecha) = 12
      AND mv.id IS NULL
""")
sueltos = cur.fetchall()
if sueltos:
    for s in sueltos:
        print(f"⚠️ SUELTO en Sistema: ID {s[0]} | ${s[2]:,.0f} | {s[3]}")
else:
    print("No hay movimientos sueltos relevantes en sistema.")

conn.close()
