import psycopg2

conn = psycopg2.connect(host='localhost', port=5433, database='Mvtos', user='postgres', password='SLB')
cur = conn.cursor()

print("--- LIMPIEZA MASIVA DE ZOMBIES ---")

# 1. Detectar TODOS los repetidos
cur.execute("""
    SELECT movimiento_sistema_id, COUNT(*) 
    FROM movimiento_vinculaciones 
    GROUP BY movimiento_sistema_id 
    HAVING COUNT(*) > 1
""")
duplicados = cur.fetchall()
print(f"Detectados {len(duplicados)} casos de sistemas con múltiples matches (ZOMBIES).")

ids_zombies = [d[0] for d in duplicados]

if ids_zombies:
    print(f"IDs Zombies: {ids_zombies}")
    
    # 2. Eliminar sus vinculaciones
    cur.execute("DELETE FROM movimiento_vinculaciones WHERE movimiento_sistema_id = ANY(%s)", (ids_zombies,))
    print(f"   Vinculaciones eliminadas: {cur.rowcount}")
    
    # 3. Eliminar los movimientos del sistema asociados (para obligar a regenerar limpio)
    cur.execute("DELETE FROM movimientos WHERE id = ANY(%s)", (ids_zombies,))
    print(f"   Movimientos sistema eliminados: {cur.rowcount}")
    
    conn.commit()
    print("✅ Limpieza completada.")
else:
    print("   No hay zombies (limpio).")


print("\n--- APLICANDO VACUNA FINAL (Constraint Unique) ---")
try:
    cur.execute("ALTER TABLE movimiento_vinculaciones ADD CONSTRAINT uq_vinculacion_sistema UNIQUE (movimiento_sistema_id);")
    conn.commit()
    print("✅✅✅ VACUNA APLICADA EXITOSAMENTE! (Constraint Unique)")
    print("   Ahora es IMPOSIBLE que se repita este problema.")
except Exception as e:
    # Si ya existe, es error "relation already exists", que es bueno
    if "already exists" in str(e):
         print("✅ La vacuna ya estaba puesta.")
    else:
         print(f"❌ Error aplicando vacuna: {e}")

conn.close()
