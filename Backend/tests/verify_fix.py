
from src.infrastructure.api.routers.movimientos import MovimientoResponse
from datetime import date, datetime

# Test case: Create response with missing IDs
try:
    resp = MovimientoResponse(
        id=1,
        fecha=date(2026, 1, 1),
        valor=100.0,
        moneda_id=None, # This was crashing before, now should work
        cuenta_id=None, # This was crashing before, now should work
        descripcion="Test",
        # Required display fields
        cuenta_display="Sin Cuenta",
        moneda_display="Sin Moneda",
        tercero_display=None,
        grupo_display=None,
        concepto_display=None,
        # Other required fields I missed
        tercero_id=None,
        grupo_id=None,
        concepto_id=None,
        created_at=datetime.now(),
        detalle=None,
        # Optional fields
        usd=None,
        trm=None
    )
    print("SUCCESS: MovimientoResponse accepted None for IDs")
    print(resp.model_dump())
except Exception as e:
    print(f"FAILURE: {e}")
