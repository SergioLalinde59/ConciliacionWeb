import psycopg2

conn = psycopg2.connect(host='localhost', port=5433, database='Mvtos', user='postgres', password='SLB')
cur = conn.cursor()

print("--- APLICANDO VACUNA CONTRA ZOMBIES (Constraints UNIQUE) ---")

commands = [
    """
    ALTER TABLE movimiento_vinculaciones 
    ADD CONSTRAINT uq_vinculacion_sistema UNIQUE (movimiento_sistema_id);
    """,
    """
    ALTER TABLE movimiento_vinculaciones 
    ADD CONSTRAINT uq_vinculacion_extracto UNIQUE (movimiento_extracto_id);
    """
]

for cmd in commands:
    try:
        cur.execute(cmd)
        print("✅ Constraint aplicado exitosamente.")
    except Exception as e:
        print(f"⚠️  Nota: {e}")
        conn.rollback()
    else:
        conn.commit()

conn.close()
