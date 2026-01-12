import psycopg2

conn = psycopg2.connect(
    host='localhost', 
    port=5432, 
    dbname='conciliacion_bancaria', 
    user='postgres', 
    password='slb.0317'
)
cur = conn.cursor()

# Quitar el .0 de las referencias
cur.execute("UPDATE tercero_descripciones SET referencia = REPLACE(referencia, '.0', '') WHERE referencia LIKE '%.0'")
print(f'Registros actualizados: {cur.rowcount}')

conn.commit()
cur.close()
conn.close()
print("¡Listo! Referencias actualizadas.")
