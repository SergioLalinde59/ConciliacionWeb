import psycopg2

conn = psycopg2.connect(host='localhost', port=5433, database='Mvtos', user='postgres', password='SLB')
cur = conn.cursor()

print("--- RESET FINAL 2M ---")

# Eliminar movimiento sistema 2157 (vinculado a Ext 1725)
# Esto dejará a Ext 1725 libre, igual que 1726
ids_to_delete = [2157]

print(f"Eliminando movimiento sistema {ids_to_delete}...")
cur.execute("DELETE FROM movimiento_vinculaciones WHERE movimiento_sistema_id = ANY(%s)", (ids_to_delete,))
cur.execute("DELETE FROM movimientos WHERE id = ANY(%s)", (ids_to_delete,))

conn.commit()
print("✅ Movimiento eliminado. Ext 1725 debe estar LIBRE ahora.")
conn.close()
