from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from typing import Dict, Any

from src.application.services.procesador_archivos_service import ProcesadorArchivosService
from src.infrastructure.api.dependencies import get_movimiento_repository, get_moneda_repository, get_tercero_repository
from src.domain.ports.movimiento_repository import MovimientoRepository
from src.domain.ports.moneda_repository import MonedaRepository
from src.domain.ports.tercero_repository import TerceroRepository

router = APIRouter(prefix="/api/archivos", tags=["archivos"])

def get_procesador_service(
    mov_repo: MovimientoRepository = Depends(get_movimiento_repository),
    moneda_repo: MonedaRepository = Depends(get_moneda_repository),
    tercero_repo: TerceroRepository = Depends(get_tercero_repository)
) -> ProcesadorArchivosService:
    return ProcesadorArchivosService(mov_repo, moneda_repo, tercero_repo)

@router.post("/cargar")
async def cargar_archivo(
    file: UploadFile = File(...),
    tipo_cuenta: str = Form(...),
    cuenta_id: int = Form(...),
    service: ProcesadorArchivosService = Depends(get_procesador_service)
) -> Dict[str, Any]:
    """
    Carga un archivo PDF (extracto) y procesa los movimientos.
    
    Args:
        file: El archivo PDF.
        tipo_cuenta: 'bancolombia_ahorro', 'credit_card', 'fondo_renta'.
        cuenta_id: ID de la cuenta en base de datos a asociar.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")

    try:
        # file.file es un SpooledTemporaryFile compatible con pdfplumber
        resultado = service.procesar_archivo(file.file, file.filename, tipo_cuenta, cuenta_id)
        return resultado
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error procesando archivo: {str(e)}")

@router.post("/analizar")
async def analizar_archivo(
    file: UploadFile = File(...),
    tipo_cuenta: str = Form(...),
    service: ProcesadorArchivosService = Depends(get_procesador_service)
) -> Dict[str, Any]:
    """
    Analiza un archivo PDF y retorna estadísticas preliminares sin guardar.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")

    try:
        resultado = service.analizar_archivo(file.file, file.filename, tipo_cuenta)
        return resultado
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error analizando archivo: {str(e)}")
