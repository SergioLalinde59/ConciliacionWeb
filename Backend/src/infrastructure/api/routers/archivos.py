from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from typing import Dict, Any

from src.application.services.procesador_archivos_service import ProcesadorArchivosService
from src.infrastructure.api.dependencies import get_movimiento_repository, get_moneda_repository, get_tercero_repository, get_conciliacion_repository, get_movimiento_extracto_repository, get_cuenta_extractor_repository
from src.domain.ports.movimiento_repository import MovimientoRepository
from src.domain.ports.moneda_repository import MonedaRepository
from src.domain.ports.tercero_repository import TerceroRepository
from src.domain.ports.conciliacion_repository import ConciliacionRepository
from src.domain.ports.movimiento_extracto_repository import MovimientoExtractoRepository
from src.domain.ports.cuenta_extractor_repository import CuentaExtractorRepository

router = APIRouter(prefix="/api/archivos", tags=["archivos"])

def get_procesador_service(
    mov_repo: MovimientoRepository = Depends(get_movimiento_repository),
    moneda_repo: MonedaRepository = Depends(get_moneda_repository),
    tercero_repo: TerceroRepository = Depends(get_tercero_repository),
    conciliacion_repo: ConciliacionRepository = Depends(get_conciliacion_repository),
    movimiento_extracto_repo: MovimientoExtractoRepository = Depends(get_movimiento_extracto_repository),
    cuenta_extractor_repo: CuentaExtractorRepository = Depends(get_cuenta_extractor_repository)
) -> ProcesadorArchivosService:
    return ProcesadorArchivosService(mov_repo, moneda_repo, tercero_repo, conciliacion_repo, movimiento_extracto_repo, cuenta_extractor_repo)

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
        tipo_cuenta: 'Ahorros', 'FondoRenta', 'MasterCardPesos', 'MasterCardUSD'.
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
