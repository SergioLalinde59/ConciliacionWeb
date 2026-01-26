import sys
import os
from decimal import Decimal

# Add src to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from infrastructure.extractors.bancolombia import ahorros_extracto, mastercard_pesos_extracto

def test_ahorros_parsing():
    print("\n--- Testing Ahorros Parsing ---")
    # Simulate text with Colombian format
    text = """
    RESUMEN DE SU CUENTA
    SALDO ANTERIOR $ 1.234.567,89
    (+) TOTAL ABONOS $ 500.000,00
    (-) TOTAL CARGOS $ 200.000,00
    SALDO ACTUAL $ 1.534.567,89
    PERIODO: 1 de enero de 2026 a 31 de enero de 2026
    """
    
    # We call internal function (since we can't mock pdfplumber easily here without more setup)
    # But wait, I can just test the _extraer functions if they were exported or just use the logic.
    # Actually, they are not exported as public but I can import them with underscore.
    
    from infrastructure.extractors.bancolombia.ahorros_extracto import _extraer_resumen_desde_texto, _parsear_valor_formato_us
    
    # Test parser directly - Bancolombia uses . for thousands and , for decimal in Ahorros
    v1 = _parsear_valor_formato_us("1.234.567,89")
    print(f"Parsed '1.234.567,89' -> {v1}")
    assert v1 == Decimal("1234567.89")
    
    # Test robust parsing with currency symbols and different separators
    from infrastructure.extractors.bancolombia.mastercard_pesos_extracto import _parsear_valor_formato_col
    v3 = _parsear_valor_formato_col("$ 1.234.567,89")
    print(f"Parsed '$ 1.234.567,89' -> {v3}")
    assert v3 == Decimal("1234567.89")
    
    v4 = _parsear_valor_formato_col("$ 19,067,747.48")
    print(f"Parsed '$ 19,067,747.48' -> {v4}")
    assert v4 == Decimal("19067747.48")
    
    v2 = _parsear_valor_formato_us("500.000,00")
    print(f"Parsed '500.000,00' -> {v2} (Expected: 500000.00)")
    assert v2 == Decimal("500000.00")
    
    # Test full text extraction logic
    data = _extraer_resumen_desde_texto(text)
    print(f"Data extracted: {data}")
    assert data['saldo_anterior'] == Decimal("1234567.89")
    assert data['entradas'] == Decimal("500000.00")
    assert data['salidas'] == Decimal("200000.00")
    assert data['saldo_final'] == Decimal("1534567.89")
    assert data['year'] == 2026
    assert data['month'] == 1

def test_mastercard_pesos_parsing():
    print("\n--- Testing MasterCard Pesos Parsing (NEW FORMAT) ---")
    # Simulate text with new format and exactly the identifiers specified by user
    text = """
    Moneda en PESOS
    Saldo anterior $ 5.000.000,00
    Compras del mes $ 1.200.000,00
    Pagos / abonos $ 2.000.000,00
    Periodo facturado desde: 30/12/2025 hasta: 31/01/2026
    """
    
    from infrastructure.extractors.bancolombia.mastercard_pesos_extracto import _extraer_resumen_desde_texto
    
    data = _extraer_resumen_desde_texto(text)
    print(f"Data extracted MC: {data}")
    
    assert data['saldo_anterior'] == Decimal("5000000.00")
    assert data['salidas'] == Decimal("1200000.00")
    assert data['entradas'] == Decimal("2000000.00")
    assert data['saldo_final'] == Decimal("4200000.00") # 5M + 1.2M - 2M
    assert data['year'] == 2026
    assert data['month'] == 1

def test_mixed_content_detection():
    print("\n--- Testing Mixed Content Detection (Security) ---")
    # This simulates a USD page (NEW FORMAT) that includes "pago en pesos" in the footer
    text_usd_page = """
    Moneda DOLARES
    Saldo anterior $ 19,28
    Compras del mes $ 0,00
    Pagos / abonos $ 0,00
    Saldo actual $ 19,28
    Información para pago en pesos: Use su cupo disponible.
    """
    
    from infrastructure.extractors.bancolombia.mastercard_pesos_extracto import _extraer_resumen_desde_texto as extraer_pesos
    from infrastructure.extractors.bancolombia.mastercard_usd_extracto import _extraer_resumen_desde_texto as extraer_usd
    
    data_pesos = extraer_pesos(text_usd_page)
    print(f"Data extracted by Pesos Extractor (Should be None): {data_pesos}")
    assert data_pesos is None
    
    data_usd = extraer_usd(text_usd_page)
    print(f"Data extracted by USD Extractor (Should have data): {data_usd}")
    assert data_usd is not None
    assert data_usd['saldo_anterior'] == Decimal("19.28")

def test_old_format_detection():
    print("\n--- Testing Old Format Detection ---")
    text_old_pesos = """
    Estado de cuenta en: PESOS
    Saldo anterior 1.000.000,00
    - Pagos / abonos 500.000,00
    = Pagos total 500.000,00
    Desde: 01/01/2025 Hasta: 31/01/2025
    """
    from infrastructure.extractors.bancolombia.mastercard_pesos_extracto_anterior import _extraer_resumen_desde_texto as extraer_pesos_old
    data = extraer_pesos_old(text_old_pesos)
    print(f"Data extracted Old Pesos: {data}")
    assert data is not None
    assert data['saldo_anterior'] == Decimal("1000000.00")

    text_old_usd = "Estado de cuenta en: DOLARES\nSaldo anterior 10.00"
    from infrastructure.extractors.bancolombia.mastercard_usd_extracto_anterior import _extraer_resumen_desde_texto as extraer_usd_old
    data_pesos = extraer_pesos_old(text_old_usd)
    assert data_pesos is None
    print("✓ Old Pesos extractor correctly rejected USD page")

if __name__ == "__main__":
    try:
        test_ahorros_parsing()
        test_mastercard_pesos_parsing()
        test_mixed_content_detection()
        test_old_format_detection()
        print("\n✅ ALL TESTS PASSED!")
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
