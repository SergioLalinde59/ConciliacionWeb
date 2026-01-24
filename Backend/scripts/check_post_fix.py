import psycopg2

conn = psycopg2.connect(host='localhost', port=5433, database='Mvtos', user='postgres', password='SLB')
cur = conn.cursor()

print("="*60)
print("DIAGNÓSTICO POST-CREACIÓN (INTENTO 2)")
print("="*60)

# 1. Conteo Total
cur.execute("""
    SELECT COUNT(*) FROM movimientos 
    WHERE cuentaid = 1 
      AND EXTRACT(YEAR FROM fecha) = 2025 
      AND EXTRACT(MONTH FROM fecha) = 12
""")
total_sistema = cur.fetchone()[0]
print(f"\n1. TOTAL MOVIMIENTOS SISTEMA (DIC 2025): {total_sistema}")
print(f"   (Esperado: 102 | Actual: {total_sistema})")

# 2. Buscar los movimientos recién creados (hoy)
cur.execute("""
    SELECT id, fecha, valor, descripcion, created_at, 
           centro_costo_id, terceroid, conceptoid
    FROM movimientos 
    WHERE cuentaid = 1 
      AND created_at >= CURRENT_DATE
    ORDER BY created_at DESC
""")
nuevos = cur.fetchall()
print(f"\n2. MOVIMIENTOS CREADOS HOY ({len(nuevos)}):")
for m in nuevos:
    print(f"   ID: {m[0]} | Fecha: {m[1]} | Valor: ${m[2]:,.0f}")
    print(f"   Desc: {m[3]}")
    print(f"   Clasificación: CC={m[5]}, Tercero={m[6]}, Concepto={m[7]}")
    
    # Verificar si está vinculado
    cur.execute("SELECT movimiento_extracto_id FROM movimiento_vinculaciones WHERE movimiento_sistema_id = %s", (m[0],))
    vinc = cur.fetchone()
    if vinc:
        print(f"   ✅ Vinculado a Extracto {vinc[0]}")
    else:
        print(f"   ❌ NO VINCULADO")
    print("-" * 40)

# 3. Verificar los 4 extractos problemáticos original
ids_extractos = [1725, 1726, 1730, 1731]
cur.execute(f"""
    SELECT me.id, me.valor, me.descripcion, mv.movimiento_sistema_id
    FROM movimientos_extracto me
    LEFT JOIN movimiento_vinculaciones mv ON me.id = mv.movimiento_extracto_id
    WHERE me.id = ANY(%s)
""", (ids_extractos,))
print(f"\n3. ESTADO EXTRACTOS PROBLEMÁTICOS:")
for e in cur.fetchall():
    match_status = f"Vinculado a {e[3]}" if e[3] else "SIN MATCH"
    print(f"   Ext {e[0]} (${e[1]:,.0f}): {match_status}")

conn.close()
