import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')

def check_nulls():
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5433'),
        database=os.getenv('DB_NAME', 'Mvtos'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD')
    )
    cur = conn.cursor()
    
    print("--- VERIFICACIÓN DE NULLS ---")
    cur.execute("""
        SELECT m.Id, m.Descripcion, m.terceroid, 
               (SELECT COUNT(*) FROM movimientos_detalle WHERE movimiento_id = m.Id) as num_detalles,
               (SELECT COUNT(*) FROM movimientos_detalle WHERE movimiento_id = m.Id AND TerceroID IS NOT NULL) as num_detalles_con_tercero
        FROM movimientos_encabezado m 
        WHERE m.terceroid IS NULL
    """)
    rows = cur.fetchall()
    for r in rows:
        print(f"ID: {r[0]}, Desc: {r[1]}, TerceroID: {r[2]}, Detalles: {r[3]}, Detalles con Tercero: {r[4]}")
    
    conn.close()

if __name__ == "__main__":
    check_nulls()
