"""
Script de prueba para verificar la extracción de datos del extracto MasterCard USD
"""
import sys
sys.path.insert(0, 'f:\\1. Cloud\\4. AI\\1. Antigravity\\ConciliacionWeb\\backend\\src')

from infrastructure.extractors.bancolombia import mastercard_usd_extracto

# Simular que tenemos un archivo PDF (deberás proporcionar la ruta real)
pdf_path = input("Ingresa la ruta del PDF de MasterCard USD: ")

try:
    with open(pdf_path, 'rb') as f:
        resultado = mastercard_usd_extracto.extraer_resumen(f)
        
        print("\n" + "="*80)
        print("DATOS EXTRAÍDOS DEL PDF:")
        print("="*80)
        print(f"Year: {resultado.get('year')}")
        print(f"Month: {resultado.get('month')}")
        print(f"Periodo Texto: {resultado.get('periodo_texto')}")
        print(f"\nSaldo Anterior: ${resultado.get('saldo_anterior'):,.2f}")
        print(f"Entradas (Pagos): ${resultado.get('entradas'):,.2f}")
        print(f"Salidas (Compras+Intereses+etc): ${resultado.get('salidas'):,.2f}")
        print(f"Saldo Final: ${resultado.get('saldo_final'):,.2f}")
        print("="*80)
        
except FileNotFoundError:
    print(f"ERROR: No se encontró el archivo {pdf_path}")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
