import psycopg2

conn = psycopg2.connect(host='localhost', port=5433, database='Mvtos', user='postgres', password='SLB')
cur = conn.cursor()

print("--- DIAGNÓSTICO ID 2156 ---")

cur.execute("""
    SELECT 
        mv.id, 
        mv.movimiento_extracto_id,
        mv.created_at
    FROM movimiento_vinculaciones mv
    WHERE mv.movimiento_sistema_id = 2156
""")
duplicados = cur.fetchall()
print(f"Sistema 2156 tiene {len(duplicados)} vinculaciones:")
for d in duplicados:
    print(f"   Vinculación ID {d[0]} -> Extracto {d[1]} | {d[2]}")

print("\n--- CORRECCIÓN AUTOMÁTICA ---")
# Eliminar este zombie
cur.execute("DELETE FROM movimiento_vinculaciones WHERE movimiento_sistema_id = 2156")
cur.execute("DELETE FROM movimientos WHERE id = 2156")
print("✅ Zombie 2156 eliminado.")
conn.commit()

# Reintentar constraint
print("\n--- REINTENTANDO VACUNA ---")
try:
    cur.execute("ALTER TABLE movimiento_vinculaciones ADD CONSTRAINT uq_vinculacion_sistema UNIQUE (movimiento_sistema_id);")
    conn.commit()
    print("✅✅✅ VACUNA APLICADA EXITOSAMENTE! (Constraint Unique)")
except Exception as e:
    print(f"❌ Error aplicando vacuna: {e}")

conn.close()
