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
print("  DIAGNÓSTICO COMPLETO - Cuenta 1, Diciembre 2025")
print("="*70 + "\n")

# 1. Totales
cur.execute("""
    SELECT 
        (SELECT COUNT(*) FROM movimientos_extracto WHERE cuenta_id = 1 AND EXTRACT(YEAR FROM fecha) = 2025 AND EXTRACT(MONTH FROM fecha) = 12) as extractos,
        (SELECT COUNT(*) FROM movimientos WHERE cuentaid = 1 AND EXTRACT(YEAR FROM fecha) = 2025 AND EXTRACT(MONTH FROM fecha) = 12) as sistema,
        (SELECT COUNT(*) FROM movimiento_vinculaciones mv 
         JOIN movimientos_extracto me ON mv.movimiento_extracto_id = me.id
         WHERE me.cuenta_id = 1 AND EXTRACT(YEAR FROM me.fecha) = 2025 AND EXTRACT(MONTH FROM me.fecha) = 12) as vinculaciones
""")

extractos, sistema, vinculaciones = cur.fetchone()
print(f"📊 TOTALES:")
print(f"   Extractos:     {extractos}")
print(f"   Sistema:       {sistema}")
print(f"   Vinculaciones: {vinculaciones}\n")

# 2. Extractos SIN vinculación
cur.execute("""
    SELECT me.id, me.fecha, me.descripcion, me.valor
    FROM movimientos_extracto me
    LEFT JOIN movimiento_vinculaciones mv ON me.id = mv.movimiento_extracto_id
    WHERE me.cuenta_id = 1 
      AND EXTRACT(YEAR FROM me.fecha) = 2025 
      AND EXTRACT(MONTH FROM me.fecha) = 12
      AND mv.id IS NULL
    ORDER BY me.fecha, me.id
""")

sin_match = cur.fetchall()
print(f"❌ EXTRACTOS SIN VINCULACIÓN: {len(sin_match)}\n")
for e in sin_match:
    print(f"   ID {e[0]}: {e[1]} | {e[2][:40]:<40} | ${e[3]:>12,.0f}")

if len(sin_match) == 0:
    print("   ✓ Todos los extractos están vinculados")

print("\n" + "-"*70 + "\n")

# 3. Movimientos creados recientemente (últimos 5 minutos)
cur.execute("""
    SELECT id, fecha, descripcion, valor, created_at
    FROM movimientos
    WHERE cuentaid = 1 
      AND EXTRACT(YEAR FROM fecha) = 2025 
      AND EXTRACT(MONTH FROM fecha) = 12
      AND created_at > NOW() - INTERVAL '5 minutes'
    ORDER BY created_at DESC
""")

recientes = cur.fetchall()
print(f"🆕 MOVIMIENTOS CREADOS RECIENTEMENTE: {len(recientes)}\n")
for m in recientes:
    print(f"   ID {m[0]}: {m[1]} | {m[2][:40]:<40} | ${m[3]:>12,.0f}")
    print(f"   Creado: {m[4]}\n")

if len(recientes) == 0:
    print("   No se encontraron movimientos recién creados")

print("\n" + "-"*70 + "\n")

# 4. Matches 1-a-muchos actuales
cur.execute("""
    SELECT 
        m.id,
        m.descripcion,
        COUNT(mv.id) as num_vinc,
        ARRAY_AGG(mv.movimiento_extracto_id ORDER BY mv.id) as extractos
    FROM movimientos m
    JOIN movimiento_vinculaciones mv ON m.id = mv.movimiento_sistema_id
    JOIN movimientos_extracto me ON mv.movimiento_extracto_id = me.id
    WHERE m.cuentaid = 1
      AND EXTRACT(YEAR FROM m.fecha) = 2025
      AND EXTRACT(MONTH FROM m.fecha) = 2025
    GROUP BY m.id, m.descripcion
    HAVING COUNT(mv.id) > 1
""")

incorrectos = cur.fetchall()
print(f"⚠️  MATCHES 1-A-MUCHOS ACTUALES: {len(incorrectos)}\n")
for inc in incorrectos:
    print(f"   Sistema ID {inc[0]}: {inc[1][:40]:<40}")
    print(f"   Vinculado a {inc[2]} extractos: {inc[3]}\n")

if len(incorrectos) == 0:
    print("   ✓ No hay matches 1-a-muchos")

print("="*70)

conn.close()
