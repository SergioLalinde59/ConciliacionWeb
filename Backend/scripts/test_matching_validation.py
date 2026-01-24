"""
Script de prueba para verificar que el servicio de validación funciona correctamente.
"""

import sys
sys.path.insert(0, 'F:\\1. Cloud\\4. AI\\1. Antigravity\\ConciliacionWeb\\Backend')

from src.application.services.matching_validation_service import detectar_matches_1_a_muchos
import json

try:
    resultado = detectar_matches_1_a_muchos(1, 2025, 12)
    print("\n✅ Detección ejecutada exitosamente\n")
    print(json.dumps(resultado, indent=2, ensure_ascii=False))
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
