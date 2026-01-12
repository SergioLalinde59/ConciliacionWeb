
import psycopg2

try:
    conn = psycopg2.connect(host='localhost', port=5433, user='postgres', password='SLB', dbname='Mvtos')
    cur = conn.cursor()
    query = """
        SELECT GrupoID, COUNT(*) 
        FROM movimientos 
        WHERE Fecha >= '2025-01-01' 
          AND Fecha <= '2025-12-31' 
          AND GrupoID IN (35, 46, 47) 
        GROUP BY GrupoID
    """
    cur.execute(query)
    results = cur.fetchall()
    print("Counts by GroupID in 2025:")
    for row in results:
        print(f"Group {row[0]}: {row[1]} movements")
        
    if not results:
        print("No movements found for groups 35, 46, 47 in 2025.")
        
    conn.close()
except Exception as e:
    print(e)
