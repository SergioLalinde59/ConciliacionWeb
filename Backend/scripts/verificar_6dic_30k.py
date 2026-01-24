import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5433,
    database='Mvtos',
    user='postgres',
    password='SLB'
)

cur = conn.cursor()

print("\n" + "="*70)
print("  EXTRACTO: 6 de diciembre 2025, valor $30,000")
print("="*70 + "\n")

# Extracto del 6 de diciembre con $30K
cur.execute("""
    SELECT id, descripcion, referencia, valor, fecha
    FROM movimientos_extracto
    WHERE cuenta_id = 1 
      AND fecha = '2025-12-06'
      AND ABS(valor) = 30000
    ORDER BY id
""")

extractos = cur.fetchall()
print(f"Movimientos en EXTRACTO: {len(extractos)}\n")
for e in extractos:
    print(f"  ID {e[0]}: {e[1]}")
    print(f"  Ref: {e[2]}, Valor: ${e[3]:,.2f}, Fecha: {e[4]}\n")

print("-"*70 + "\n")

# Sistema del 6 de diciembre con $30K
cur.execute("""
    SELECT id, descripcion, referencia, valor, fecha
    FROM movimientos
    WHERE cuentaid = 1 
      AND fecha = '2025-12-06'
      AND ABS(valor) = 30000
    ORDER BY id
""")

sistema = cur.fetchall()
print(f"Movimientos en SISTEMA: {len(sistema)}\n")
for s in sistema:
    print(f"  ID {s[0]}: {s[1]}")
    print(f"  Ref: {s[2]}, Valor: ${s[3]:,.2f}, Fecha: {s[4]}\n")

print("="*70)
print(f"\n📊 RESUMEN 6 DIC ($30K):")
print(f"   Extracto: {len(extractos)} movimiento(s)")
print(f"   Sistema:  {len(sistema)} movimiento(s)")

if len(extractos) == len(sistema):
    print(f"   ✅ Cantidades coinciden\n")
else:
    print(f"   ❌ Diferencia: {abs(len(extractos) - len(sistema))} movimiento(s)\n")

# Ahora verificar vinculaciones
if len(extractos) > 0:
    extracto_ids = [e[0] for e in extractos]
    cur.execute(f"""
        SELECT movimiento_extracto_id, movimiento_sistema_id
        FROM movimiento_vinculaciones
        WHERE movimiento_extracto_id = ANY(%s)
        ORDER BY movimiento_extracto_id
    """, (extracto_ids,))
    
    vincs = cur.fetchall()
    print(f"Vinculaciones actuales: {len(vincs)}\n")
    for v in vincs:
        print(f"  Extracto {v[0]} → Sistema {v[1]}")

conn.close()
