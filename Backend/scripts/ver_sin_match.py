import psycopg2

conn = psycopg2.connect(host='localhost', port=5433, database='Mvtos', user='postgres', password='SLB')
cur = conn.cursor()

# Ver extractos sin match
cur.execute("""
    SELECT me.id, me.descripcion, me.valor  
    FROM movimientos_extracto me
    LEFT JOIN movimiento_vinculaciones mv ON me.id = mv.movimiento_extracto_id  
    WHERE me.cuenta_id = 1 AND EXTRACT(YEAR FROM fecha) = 2025 AND EXTRACT(MONTH FROM fecha) = 12
      AND mv.id IS NULL
""")
sin_match = cur.fetchall()

print(f"\n{'='*60}")
print(f"EXTRACTOS SIN VINCULACION: {len(sin_match)}")
print(f"{'='*60}\n")
for e in sin_match:
    print(f"ID {e[0]:<6} {e[1][:35]:<35} ${e[2]:>12,.0f}")

# Totales
cur.execute("""SELECT 
    (SELECT COUNT(*) FROM movimientos_extracto WHERE cuenta_id=1 AND EXTRACT(YEAR FROM fecha)=2025 AND EXTRACT(MONTH FROM fecha)=12),
    (SELECT COUNT(*) FROM movimientos WHERE cuentaid=1 AND EXTRACT(YEAR FROM fecha)=2025 AND EXTRACT(MONTH FROM fecha)=12),
    (SELECT COUNT(*) FROM movimiento_vinculaciones mv JOIN movimientos_extracto me ON mv.movimiento_extracto_id=me.id 
     WHERE me.cuenta_id=1 AND EXTRACT(YEAR FROM me.fecha)=2025 AND EXTRACT(MONTH FROM me.fecha)=12)
""")
e, s, v = cur.fetchone()
print(f"\n{'='*60}")
print(f"Extracto: {e} | Sistema: {s} | Vinculaciones: {v}")
print(f"{'='*60}\n")

conn.close()
