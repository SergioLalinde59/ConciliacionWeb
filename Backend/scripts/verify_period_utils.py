from src.infrastructure.extractors.utils import extraer_periodo_de_movimientos, extraer_periodo_de_nombre_archivo, obtener_nombre_mes

def test_utilities():
    print("Testing obtener_nombre_mes...")
    assert obtener_nombre_mes(1) == "ENE"
    assert obtener_nombre_mes(12) == "DIC"
    assert obtener_nombre_mes(0) == "UNK"
    print("✓ obtener_nombre_mes passed")

    print("\nTesting extraer_periodo_de_movimientos...")
    movs = [
        {'fecha': '2026-01-13', 'valor': 100},
        {'fecha': '2026-01-14', 'valor': 200}
    ]
    assert extraer_periodo_de_movimientos(movs) == "2026-ENE"
    assert extraer_periodo_de_movimientos([]) == None
    print("✓ extraer_periodo_de_movimientos passed")

    print("\nTesting extraer_periodo_de_nombre_archivo...")
    assert extraer_periodo_de_nombre_archivo("movimientos_2025-05.pdf") == (2025, 5)
    assert extraer_periodo_de_nombre_archivo("extracto202412.pdf") == (2024, 12)
    assert extraer_periodo_de_nombre_archivo("random_file.pdf") == None
    print("✓ extraer_periodo_de_nombre_archivo passed")

if __name__ == "__main__":
    try:
        test_utilities()
        print("\nAll utility tests PASSED! 🚀")
    except Exception as e:
        print(f"\nTests FAILED: {e}")
        import traceback
        traceback.print_exc()
