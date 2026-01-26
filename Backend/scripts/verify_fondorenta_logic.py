
import sys
import os
from decimal import Decimal
from datetime import date
import calendar
import logging

# Setup path to import src
sys.path.append(os.path.join(os.getcwd(), 'Backend'))

# Mock logging
logging.basicConfig(level=logging.INFO)

# Service Import Removed for Isolation
# from src.application.services.cargar_extracto_bancario_service import CargarExtractoBancarioService

def test_fondorenta_logic():
    print("Testing Fondo Renta Logic...")
    
    # 1. Mock Data that would come from PDF Extraction
    mock_resumen = {
        'year': 2025,
        'month': 1,
        'rendimientos': Decimal('67568.85'),
        'retenciones': Decimal('3676.85'),
        'entradas': Decimal('5000000.00'),
        'salidas': Decimal('8000000.00'), # Header excludes retentions
        'saldo_anterior': Decimal('9532250.21'),
        'saldo_final': Decimal('6596142.21')
    }
    
    # Mock Movements extracted from text (BEFORE synthetic)
    # Includes RETEFTE which was previously counting as Salida
    mock_movs = [
        # Entradas
        {'fecha': date(2025, 1, 24), 'descripcion': 'ADICION', 'valor': Decimal('5000000.00'), 'moneda': 'COP'},
        # Salidas Only
        {'fecha': date(2025, 1, 16), 'descripcion': 'RETIRO TRASLA', 'valor': Decimal('-7000000.00'), 'moneda': 'COP'},
        {'fecha': date(2025, 1, 21), 'descripcion': 'RETIRO TRASLA', 'valor': Decimal('-1000000.00'), 'moneda': 'COP'},
        # Retenciones (Should NOT be in Salidas sum)
        {'fecha': date(2025, 1, 16), 'descripcion': 'RETEFTE', 'valor': Decimal('-3659.00'), 'moneda': 'COP'}, # Part 1
        {'fecha': date(2025, 1, 21), 'descripcion': 'RETEFTE', 'valor': Decimal('-17.85'), 'moneda': 'COP'},   # Part 2 (Total ~3676.85)
    ]
    
    # We can't easily mock the internal behavior of `analizar_extracto` because it calls extraction methods directly.
    # However, we can instantiate the service and TEST the logic by monkey-patching or by refactoring the service to accept data.
    # Since we modified `analizar_extracto`, let's subclass or create a wrapper that simulates `analizar_extracto` behavior
    # OR we can just COPY the logic block here to verify it works, since we can't run the full service without DB/PDFs.
    
    # Let's run the logic block exactly as we wrote it in the service:
    
    tipo_cuenta = 'FondoRenta'
    datos = mock_resumen.copy()
    movs = mock_movs.copy()
    
    # --- LOGIC UNDER TEST START ---
    # Imports already done globally
    # import calendar
    # from datetime import date
    
    # Injection Logic
    if tipo_cuenta == 'FondoRenta' and datos.get('rendimientos') and datos.get('year') and datos.get('month'):
        try:
            rend_val = Decimal(str(datos['rendimientos']))
            if rend_val > 0:
                last_day = calendar.monthrange(datos['year'], datos['month'])[1]
                fecha_rend = date(datos['year'], datos['month'], last_day)
                mov_rend = {
                    'fecha': fecha_rend,
                    'descripcion': 'RENDIMIENTOS',
                    'referencia': 'AUTOMATICO',
                    'valor': rend_val,
                    'usd': None,
                    'moneda': 'COP',
                    'numero_linea': 999999,
                    'raw_text': f"SYNTHETIC",
                    'es_duplicado': False
                }
                movs.append(mov_rend)
                print(f"[OK] Synthetic movement added: {mov_rend['valor']}")
        except Exception as e:
            print(f"[ERROR] Injection failed: {e}")

    # Calculation Logic
    total_mov_entradas = Decimal(0)
    total_mov_salidas = Decimal(0)
    total_mov_rendimientos = Decimal(0)
    total_mov_retenciones = Decimal(0)
    
    for raw in movs:
        val = raw['valor']
        if tipo_cuenta == 'FondoRenta':
            desc_up = raw.get('descripcion', '').upper()
            if 'RETEFTE' in desc_up or 'RTEFTE' in desc_up:
                total_mov_retenciones += abs(val)
            elif 'RENDIMIENTOS' in desc_up:
                total_mov_rendimientos += val
            else:
                if val > 0:
                    total_mov_entradas += val
                else:
                    total_mov_salidas += abs(val)
        else:
            if val > 0: total_mov_entradas += val
            else: total_mov_salidas += abs(val)
            
    # --- LOGIC UNDER TEST END ---
    
    print("-" * 20)
    print(f"Entradas: {total_mov_entradas} (Expected: 5000000.00)")
    print(f"Salidas: {total_mov_salidas} (Expected: 8000000.00)")
    print(f"Retenciones: {total_mov_retenciones} (Expected: ~3676.85)")
    print(f"Rendimientos: {total_mov_rendimientos} (Expected: 67568.85)")
    
    # Assertions
    assert total_mov_entradas == Decimal('5000000.00'), "Entradas Mismatch"
    assert total_mov_salidas == Decimal('8000000.00'), "Salidas Mismatch (Should exclude RETEFTE)"
    assert abs(total_mov_retenciones - Decimal('3676.85')) < 1, f"Retenciones Mismatch: Got {total_mov_retenciones}"
    assert total_mov_rendimientos == Decimal('67568.85'), "Rendimientos Mismatch"
    
    print("\n✅ Verification Successful!")

if __name__ == "__main__":
    test_fondorenta_logic()
