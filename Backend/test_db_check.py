import psycopg2

# Conexión directa - ajustar según tu configuración
conn = psycopg2.connect(host='localhost', port=5432, dbname='conciliacion_bancaria', user='postgres', password='slb.0317')
cur = conn.cursor()

print("=== Buscando referencia 23019875482 en tercero_descripciones ===")
cur.execute("SELECT id, terceroid, descripcion, referencia, activa FROM tercero_descripciones WHERE referencia LIKE '%23019%' OR referencia = '23019875482'")
rows = cur.fetchall()
if rows:
    for r in rows:
        print(f"  ID={r[0]}, TerceroID={r[1]}, Desc={r[2]}, Ref={r[3]}, Activa={r[4]}")
else:
    print("  NO SE ENCONTRÓ - La referencia NO existe en la tabla!")

print("\n=== Tercero ID=74 ===")
cur.execute("SELECT terceroid, tercero FROM terceros WHERE terceroid = 74")
t = cur.fetchone()
if t:
    print(f"  TerceroID={t[0]}, Nombre={t[1]}")

print("\n=== Descripciones del tercero 74 ===")
cur.execute("SELECT id, descripcion, referencia FROM tercero_descripciones WHERE terceroid = 74 AND activa = TRUE")
for r in cur.fetchall():
    print(f"  ID={r[0]}, Desc={r[1]}, Ref={r[2]}")

cur.close()
conn.close()
