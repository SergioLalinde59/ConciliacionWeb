import psycopg2

conn = psycopg2.connect(host='localhost', port=5433, database='Mvtos', user='postgres', password='SLB')
cur = conn.cursor()

print("COLUMNAS TABLA MOVIMIENTOS:")
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'movimientos'")
for row in cur.fetchall():
    print(row[0])
conn.close()
