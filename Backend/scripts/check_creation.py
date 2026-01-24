import psycopg2
import json
from datetime import datetime

def default_serializer(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()

conn = psycopg2.connect(host='localhost', port=5433, database='Mvtos', user='postgres', password='SLB')
cur = conn.cursor()

print("="*60)
print("DIAGNÓSTICO POST-CREACIÓN")
print("="*60)

# 1. Verificar si existen movimientos creados hoy
cur.execute("""
    SELECT id, fecha, valor, descripcion, created_at, detalle 
    FROM movimientos 
    WHERE cuentaid = 1 
      AND created_at >= CURRENT_DATE 
    ORDER BY created_at DESC
""")
nuevos = cur.fetchall()
print(f"\n1. MOVIMIENTOS CREADOS HOY EN SISTEMA: {len(nuevos)}")
for m in nuevos:
    print(f"   ID: {m[0]} | Fecha: {m[1]} | Valor: ${m[2]:,.0f} | Desc: {m[3]}")
    print(f"   Creado: {m[4]} | Detalle: {m[5]}\n")

# 2. Verificar estado de los 4 extractos problemáticos
ids_interes = [1725, 1726, 1730, 1731]
cur.execute(f"""
    SELECT 
        me.id as ext_id,
        me.valor,
        COUNT(mv.id) as tiene_match,
        m.id as vincul_sistema_id,
        m.descripcion
    FROM movimientos_extracto me
    LEFT JOIN movimiento_vinculaciones mv ON me.id = mv.movimiento_extracto_id
    LEFT JOIN movimientos m ON mv.movimiento_sistema_id = m.id
    WHERE me.id = ANY(%s)
    GROUP BY me.id, me.valor, m.id, m.descripcion
    ORDER BY me.id
""", (ids_interes,))

print("2. ESTADO DE EXTRACTOS PROBLEMÁTICOS:")
for r in cur.fetchall():
    estado = f"✅ Vinculado a {r[3]}" if r[2] > 0 else "❌ SIN MATCH"
    print(f"   Ext {r[0]} (${r[1]:,.0f}): {estado}")

# 3. Verificar si todavía existen matches 1-a-muchos
cur.execute("""
    SELECT m.id, COUNT(mv.id)
    FROM movimientos m
    JOIN movimiento_vinculaciones mv ON m.id = mv.movimiento_sistema_id
    JOIN movimientos_extracto me ON mv.movimiento_extracto_id = me.id
    WHERE m.cuentaid = 1 AND EXTRACT(MONTH FROM m.fecha) = 12
    GROUP BY m.id
    HAVING COUNT(mv.id) > 1
""")
duplicados = cur.fetchall()
print(f"\n3. MATCHES 1-A-MUCHOS RESTANTES: {len(duplicados)}")
for d in duplicados:
    print(f"   Sistema ID {d[0]} tiene {d[1]} vinculaciones")

conn.close()
