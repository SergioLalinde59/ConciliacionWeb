"""
API endpoints para validación y corrección de matches.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.matching_validation_service import (
    detectar_matches_1_a_muchos,
    invalidar_matches_1_a_muchos
)

router = APIRouter(prefix="/api/matching", tags=["matching-validation"])


class DetectarMatchesRequest(BaseModel):
    cuenta_id: int
    year: int
    month: int


@router.post("/detectar-1-a-muchos")
def api_detectar_matches_1_a_muchos(request: DetectarMatchesRequest):
    """
    Detecta movimientos del sistema vinculados incorrectamente a múltiples extractos.
    """
    try:
        resultado = detectar_matches_1_a_muchos(
            request.cuenta_id,
            request.year,
            request.month
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invalidar-1-a-muchos")
def api_invalidar_matches_1_a_muchos(request: DetectarMatchesRequest):
    """
    Elimina vinculaciones incorrectas donde 1 sistema → múltiples extractos.
    """
    try:
        resultado = invalidar_matches_1_a_muchos(
            request.cuenta_id,
            request.year,
            request.month
        )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
