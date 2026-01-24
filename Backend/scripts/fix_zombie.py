import psycopg2

conn = psycopg2.connect(host='localhost', port=5433, database='Mvtos', user='postgres', password='SLB')
cur = conn.cursor()

print("--- CIRUGÍA DE DATOS: MATCH 1-A-MUCHOS ---")

# ID del movimiento sistema problemático
sys_id = 2134
ext_ids = [1725, 1726]

print(f"\nEliminando Movimiento Sistema ID {sys_id}...")

# 1. Borrar vinculaciones
cur.execute("DELETE FROM movimiento_vinculaciones WHERE movimiento_sistema_id = %s", (sys_id,))
deleted_links = cur.rowcount
print(f"   Deleted links: {deleted_links}")

# 2. Borrar movimiento
cur.execute("DELETE FROM movimientos WHERE id = %s", (sys_id,))
deleted_movs = cur.rowcount
print(f"   Deleted movs: {deleted_movs}")

conn.commit()

# 3. Verificar estado final
print(f"\nEstado final de extractos {ext_ids}:")
cur.execute(f"""
    SELECT me.id, mv.id 
    FROM movimientos_extracto me
    LEFT JOIN movimiento_vinculaciones mv ON me.id = mv.movimiento_extracto_id
    WHERE me.id = ANY(%s)
""", (ext_ids,))

for row in cur.fetchall():
    status = "LIBRE ✅" if row[1] is None else f"Vinculado a {row[1]} ❌"
    print(f"   Ext {row[0]}: {status}")

conn.close()
