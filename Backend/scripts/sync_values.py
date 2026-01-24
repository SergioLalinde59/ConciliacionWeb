import psycopg2

conn = psycopg2.connect(host='localhost', port=5433, database='Mvtos', user='postgres', password='SLB')
cur = conn.cursor()

print("--- SINCRONIZACIÓN DE VALORES (EXTRACTO -> SISTEMA) ---")

# Seleccionar diferencias
cur.execute("""
    SELECT 
        m.id as sis_id,
        me.valor as val_ext,
        m.valor as val_sis
    FROM movimiento_vinculaciones mv
    JOIN movimientos_extracto me ON mv.movimiento_extracto_id = me.id
    JOIN movimientos m ON mv.movimiento_sistema_id = m.id
    WHERE me.valor != m.valor
""")
rows = cur.fetchall()
print(f"Se actualizarán {len(rows)} movimientos para igualar al extracto.")

# Actualizar uno por uno para mayor seguridad y logging
actualizados = 0
for r in rows:
    sis_id = r[0]
    val_ext = r[1]
    # print(f"Adjusting Sis {sis_id}: {r[2]} -> {val_ext}")
    
    cur.execute("UPDATE movimientos SET valor = %s WHERE id = %s", (val_ext, sis_id))
    actualizados += cur.rowcount

conn.commit()
print(f"✅ Sincronización completada. {actualizados} registros actualizados.")
conn.close()
