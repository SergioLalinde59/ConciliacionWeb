import sys
import os
from unittest.mock import MagicMock
from decimal import Decimal

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'src')) 
# Assuming script is run from backend dir, adding 'src' might be needed or just '.'

from src.application.services.clasificacion_service import ClasificacionService
from src.domain.models.movimiento import Movimiento

def test_pipeline():
    print("🚀 Verifying Unified Search Pipeline...")
    
    # Mocks
    mov_repo = MagicMock()
    tercero_repo = MagicMock()
    tercero_desc_repo = MagicMock()
    
    service = ClasificacionService(
        movimiento_repo=mov_repo,
        reglas_repo=MagicMock(),
        tercero_repo=tercero_repo,
        tercero_descripcion_repo=tercero_desc_repo,
        concepto_repo=MagicMock(),
        centro_costo_repo=MagicMock()
    )
    
    # Case: "PAGO SUC VIRT TC MASTER PESOS"
    target_mov = Movimiento(
        id=999,
        moneda_id=1,
        fecha="2023-01-01",
        descripcion="PAGO SUC VIRT TC MASTER PESOS",
        valor=Decimal("-500000"),
        cuenta_id=1,
        referencia="12345"
    )
    mov_repo.obtener_por_id.return_value = target_mov
    
    # Mock Candidates
    
    # 1. High Text Match (Correct one) - "PAGO TC MASTER"
    match_ok = Movimiento(
        id=101,
        moneda_id=1,
        cuenta_id=1,
        fecha="2022-12-01",
        descripcion="PAGO TC MASTER", # Good match
        valor=Decimal("-500000"), # Perfect value match
        tercero_id=10,
        centro_costo_id=1,
        concepto_id=1,
        referencia="99999"
    )
    
    # 2. Low Text Match but Perfect Value (Distractor) - "TRANSFERENCIA A JUAN"
    # This shouldn't even be found by keyword search unless keywords intersect.
    # Let's say it has "PESOS" in it to trigger a find.
    distractor_value = Movimiento(
        id=102,
        moneda_id=1,
        cuenta_id=1,
        fecha="2022-12-05",
        descripcion="TRANSFERENCIA PESOS A JUAN", # Found by "PESOS"
        valor=Decimal("-500000"), # Perfect value match
        tercero_id=20,
        centro_costo_id=2,
        concepto_id=2,
        referencia="88888"
    )
    
    # 3. Partial Text Match (PAGO) but different value
    distractor_text = Movimiento(
        id=103,
        moneda_id=1,
        cuenta_id=1,
        fecha="2022-12-10",
        descripcion="PAGO SERVICIOS PUBLICOS", # "PAGO" matches
        valor=Decimal("-150000"),
        tercero_id=30,
        centro_costo_id=3,
        concepto_id=3,
        referencia="77777"
    )
    
    # Setup repo behavior for "buscar_avanzado"
    def buscar_avanzado_side_effect(descripcion_contiene=None, limit=None, **kwargs):
        results = []
        if descripcion_contiene:
            term = descripcion_contiene.upper()
            if "PAGO" in term:
                results.append(match_ok)
                results.append(distractor_text)
            if "MASTER" in term:
                results.append(match_ok)
            if "TC" in term:
                results.append(match_ok)
            if "PESOS" in term:
               results.append(match_ok)
               results.append(distractor_value)
                
        return results, len(results)

    mov_repo.buscar_avanzado.side_effect = buscar_avanzado_side_effect
    mov_repo.buscar_por_referencia.return_value = [] # No ref match
    
    # Configure other repos to return empty so we fall through to Exhaustive Search
    tercero_desc_repo.buscar_por_referencia.return_value = None
    tercero_desc_repo.buscar_por_descripcion.return_value = []
    
    # Mock Tercero Repo to return names
    mock_tc = MagicMock()
    mock_tc.tercero = "MASTERCARD"
    tercero_repo.obtener_por_id.return_value = mock_tc
    
    # Execute
    print(f"\nTarget: {target_mov.descripcion} (${target_mov.valor})")
    result = service.obtener_sugerencia_clasificacion(999)
    
    # Verify
    sugerencia = result['sugerencia']
    contexto = result['contexto']
    
    print("\n--- Result ---")
    print(f"Sugerencia Tercero ID: {sugerencia['tercero_id']}")
    print(f"Razón: {sugerencia['razon']}")
    print(f"Tipo Match: {sugerencia['tipo_match']}")
    
    print(f"\n--- Contexto ({len(contexto)}) ---")
    for m in contexto:
        print(f" - {m.descripcion} (${m.valor})")
        
    # Assertion
    # Expected match: id    # Assertion
    if sugerencia['tercero_id'] == 10:
        print("\nTEST RESULT: SUCCESS - Correct candidate (ID 101) selected.")
    else:
        print(f"\nTEST RESULT: FAILED - Expected Tercero ID 10, got {sugerencia['tercero_id']}")

if __name__ == '__main__':
    test_pipeline()
