import psycopg2

conn = psycopg2.connect(host='localhost', port=5433, database='Mvtos', user='postgres', password='SLB')
cur = conn.cursor()

print("CONSTRAINTS DE movimiento_vinculaciones:")
cur.execute("""
    SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name 
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_name = 'movimiento_vinculaciones'
""")
for row in cur.fetchall():
    print(f"{row[1]} | {row[2]} ({row[0]})")
conn.close()
