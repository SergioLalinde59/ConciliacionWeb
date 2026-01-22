import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

import pytest
from src.domain.models.movimiento_match import MatchEstado, MovimientoMatch
from src.domain.services.matching_service import MatchingService
from src.domain.models.movimiento import Movimiento
from src.domain.models.movimiento_extracto import MovimientoExtracto
from datetime import date
from decimal import Decimal

def test_no_traslado_status():
    """Verify that TRASLADO status is no longer available and logic doesn't return it."""
    
    # 1. Check Enum
    assert 'TRASLADO' not in MatchEstado.__members__, "TRASLADO should not be in MatchEstado enum"

    # 2. Check Matching Logic
    service = MatchingService()
    
    # Create dummy data that would have been a transfer
    extracto = MovimientoExtracto(
        id=1,
        cuenta_id=1,
        year=2023,
        month=1,
        fecha=date(2023, 1, 1),
        descripcion="TRASLADO DE FONDOS A CUENTA X",
        referencia="REF123",
        valor=Decimal("-1000000")
    )
    
    # No system movements
    movimientos_sistema = []
    
    from src.domain.models.configuracion_matching import ConfiguracionMatching
    
    config = ConfiguracionMatching(
        id=1,
        tolerancia_valor=Decimal("0.0"),
        similitud_descripcion_minima=0.8,
        peso_fecha=0.3,
        peso_valor=0.5,
        peso_descripcion=0.2,
        score_minimo_exacto=0.9,
        score_minimo_probable=0.7,
        activo=True
    )

    # Run matching
    matches = service.ejecutar_matching([extracto], movimientos_sistema, config)
    
    # Verify result
    assert len(matches) == 1
    match = matches[0]
    
    print(f"Match status: {match.estado}")
    assert match.estado == MatchEstado.SIN_MATCH, "Should be SIN_MATCH, not TRASLADO"
    assert not hasattr(match, 'es_traslado'), "Should not have es_traslado attribute"

if __name__ == "__main__":
    try:
        test_no_traslado_status()
        print("SUCCESS: Traslado status successfully removed.")
    except AssertionError as e:
        print(f"FAILURE: {e}")
    except Exception as e:
        print(f"ERROR: {e}")
