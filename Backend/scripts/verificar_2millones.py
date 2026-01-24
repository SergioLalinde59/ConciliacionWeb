import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5433,
    database='Mvtos',
    user='postgres',
    password='SLB'
)

cur = conn.cursor()

# Buscar movimientos del extracto del 2 de diciembre por $2,000,000
cur.execute("""
    SELECT id, descripcion, valor, fecha
    FROM movimientos_extracto
    WHERE cuenta_id = 1 
      AND fecha = '2025-12-02'
      AND ABS(valor) = 2000000
    ORDER BY id
""")

results = cur.fetchall()

print(f'\nMovimientos en el EXTRACTO del 2 de diciembre por $2,000,000:\n')
print(f'Total encontrados: {len(results)}\n')
print('='*70)

for i, r in enumerate(results, 1):
    print(f'\n{i}. Extracto ID: {r[0]}')
    print(f'   Descripción: {r[1]}')
    print(f'   Valor: ${r[2]:,.2f}')
    print(f'   Fecha: {r[3]}')

print('\n' + '='*70)

# Ahora buscar en el sistema
cur.execute("""
    SELECT id, descripcion, valor, fecha
    FROM movimientos
    WHERE cuentaid = 1 
      AND fecha = '2025-12-02'
      AND ABS(valor) = 2000000
    ORDER BY id
""")

results_sistema = cur.fetchall()

print(f'\nMovimientos en el SISTEMA del 2 de diciembre por $2,000,000:\n')
print(f'Total encontrados: {len(results_sistema)}\n')
print('='*70)

for i, r in enumerate(results_sistema, 1):
    print(f'\n{i}. Sistema ID: {r[0]}')
    print(f'   Descripción: {r[1]}')
    print(f'   Valor: ${r[2]:,.2f}')
    print(f'   Fecha: {r[3]}')

print('\n' + '='*70)
print(f'\n📊 RESUMEN:')
print(f'   Extracto: {len(results)} movimiento(s)')
print(f'   Sistema:  {len(results_sistema)} movimiento(s)')
print(f'   Diferencia: {len(results) - len(results_sistema)} movimiento(s)\n')

conn.close()
