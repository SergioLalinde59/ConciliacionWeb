import logging
import datetime
from decimal import Decimal
from src.infrastructure.extractors.fondorenta import _extraer_resumen_desde_texto_full, _extraer_movimientos_desde_texto, _procesar_movimientos

# Configure logging
logging.basicConfig(level=logging.INFO)

# Mock text for SUMMARY (unchanged)
mock_summary_text = """
RENTA FIJA PLAZO
N.I.T. 900.000.531
EXTRACTO MENSUAL
Cuenta de Inversión: 437000004144
Desde: 20251201 Hasta: 20251231
Valor Unidad al Final: 39.897,86978598
Rentabilidad Periodo: 5,89- % NETA
Fecha de Vencimiento:

SALDO ANTERIOR ADICIONES RETIROS
VALOR EN PESOS VALOR EN UNIDADES VALOR EN PESOS VALOR EN PESOS
2.457.535,91 61,27892292 23.500.000,00 18.700.000,00
REND. NETOS RETENCIÓN NUEVO SALDO
VALOR EN PESOS VALOR EN PESOS VALOR EN PESOS VALOR EN UNIDADES
-18.542,76 1.087,38 7.237.905,77 181,41083248
"""

# Mock text for MOVEMENTS (Image 4)
mock_movs_text = """
FECHA. TRANSACCIÓN MOVIMIENTOS SALDO
VALOR EN PESOS VALOR EN UNIDADES VALOR EN PESOS
20251201 ADICION 7.000.000,00 174,58986829 9.457.535,91
20251210 RETIRO TRASLA 1.000.000,00 24,98041965 17.493.956,84
20251210 RETEFTE 130,87 0,00326918 17.493.956,84
20251230 ADICION 6.500.000,00 162,96000067 7.239.046,04
"""

print("--- Start Verification (Summary) ---")
result = _extraer_resumen_desde_texto_full(mock_summary_text)

if result:
    print("✅ Summary extracted successfully.")
else:
    print("❌ Summary extraction failed.")


print("\n--- Start Verification (Movements) ---")
raw_movs = _extraer_movimientos_desde_texto(mock_movs_text)
print(f"Raw Movs Found: {len(raw_movs)}")
for m in raw_movs:
    print(f"  Raw: {m}")

processed_movs = _procesar_movimientos(raw_movs)
print(f"Processed Movs: {len(processed_movs)}")

# Test Data Assertions
assert len(processed_movs) == 4, "Should have 4 movements"

# Mov 1: ADICION (Positive)
m1 = processed_movs[0]
assert m1['valor'] == Decimal('7000000.00'), f"M1 Valor error: {m1['valor']}"
assert m1['fecha'] == '2025-12-01', f"M1 Date error: {m1['fecha']}"
assert m1['valor'] > 0, "Adicion should be positive"

# Mov 2: RETIRO TRASLA (Negative)
m2 = processed_movs[1]
assert m2['valor'] == Decimal('-1000000.00'), f"M2 Valor error: {m2['valor']}"
assert m2['valor'] < 0, "Retiro should be negative"

# Mov 3: RETEFTE (Negative)
m3 = processed_movs[2]
assert m3['valor'] == abs(Decimal('130.87')) * -1, f"M3 Valor error: {m3['valor']}" 
# Note: parsear_valor usually returns Decimal. abs() works on Decimal.

print("\n✅ Verification Successful: Movements extracted and signs applied correctly.")
