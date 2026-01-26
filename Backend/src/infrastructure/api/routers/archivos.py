from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from typing import Dict, Any, Optional, List
from decimal import Decimal
import os

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
    actualizar_descripciones: bool = Form(False),
    service: ProcesadorArchivosService = Depends(get_procesador_service)
) -> Dict[str, Any]:
    """
    Carga un archivo PDF (extracto) y procesa los movimientos.
    
    Args:
        file: El archivo PDF.
        tipo_cuenta: 'Ahorros', 'FondoRenta', 'MasterCardPesos', 'MasterCardUSD'.
        cuenta_id: ID de la cuenta en base de datos a asociar.
        actualizar_descripciones: Si es True, actualiza la descripción de movimientos existentes (fecha+valor).
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")

    try:
        # file.file es un SpooledTemporaryFile compatible con pdfplumber
        resultado = service.procesar_archivo(file.file, file.filename, tipo_cuenta, cuenta_id, actualizar_descripciones)
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
    cuenta_id: Optional[int] = Form(None),
    service: ProcesadorArchivosService = Depends(get_procesador_service)
) -> Dict[str, Any]:
    """
    Analiza un archivo PDF y retorna estadísticas preliminares sin guardar.
    """
    print(f"DEBUG ROUTER: analizar_archivo called. tipo_cuenta={tipo_cuenta}, cuenta_id={cuenta_id}, filename={file.filename}")
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")

    try:
        resultado = service.analizar_archivo(file.file, file.filename, tipo_cuenta, cuenta_id)
        return resultado
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.get("/listar-directorios")
async def listar_directorios(tipo: str) -> List[str]:
    """
    Lista los archivos PDF disponibles en el directorio configurado para el tipo 'movimientos' o 'extractos'.
    """
    directory = ""
    if tipo == "movimientos":
        directory = os.getenv("DIRECTORIO_MOVIMIENTOS", "")
    elif tipo == "extractos":
        directory = os.getenv("DIRECTORIO_EXTRACTOS", "")
    else:
        raise HTTPException(status_code=400, detail="Tipo inválido. Use 'movimientos' o 'extractos'.")

    if not directory or not os.path.exists(directory):
        # Si no está configurado o no existe, retornamos lista vacía o error.
        # Retornaremos vacía para no romper el front si no está configurado.
        print(f"Directorio no encontrado o no configurado: {directory}")
        return []

    try:
        files = [f for f in os.listdir(directory) if f.lower().endswith('.pdf')]
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error leyendo directorio: {str(e)}")

@router.post("/procesar-local")
async def procesar_archivo_local(
    filename: str = Form(...),
    tipo: str = Form(...), # 'movimientos' o 'extractos'
    tipo_cuenta: str = Form(...),
    cuenta_id: Optional[int] = Form(None),
    actualizar_descripciones: bool = Form(False),
    year: Optional[int] = Form(None),
    month: Optional[int] = Form(None),
    accion: str = Form("analizar"), # 'analizar' o 'cargar'
    # Optional overrides
    saldo_anterior: Optional[Decimal] = Form(None),
    entradas: Optional[Decimal] = Form(None),
    salidas: Optional[Decimal] = Form(None),
    saldo_final: Optional[Decimal] = Form(None),
    rendimientos: Optional[Decimal] = Form(None),
    retenciones: Optional[Decimal] = Form(None),
    service: ProcesadorArchivosService = Depends(get_procesador_service)
) -> Dict[str, Any]:
    """
    Procesa un archivo local (del servidor) como si fuera un upload.
    accion: 'analizar' o 'cargar'
    """
    directory = ""
    if tipo == "movimientos":
        directory = os.getenv("DIRECTORIO_MOVIMIENTOS", "")
    elif tipo == "extractos":
        directory = os.getenv("DIRECTORIO_EXTRACTOS", "")
    else:
        raise HTTPException(status_code=400, detail="Tipo inválido")

    if not directory:
        raise HTTPException(status_code=500, detail="Directorio base no configurado")
        
    filepath = os.path.join(directory, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Archivo no encontrado en el servidor")

    try:
        with open(filepath, 'rb') as f:
            if accion == "analizar":
                if tipo == "movimientos":
                    return service.analizar_archivo(f, filename, tipo_cuenta, cuenta_id)
                elif tipo == "extractos":
                    return service.analizar_extracto(f, filename, tipo_cuenta, cuenta_id)
            elif accion == "cargar":
                if tipo == "movimientos":
                    return service.procesar_archivo(f, filename, tipo_cuenta, cuenta_id, actualizar_descripciones)
                elif tipo == "extractos":
                    # Prepare overrides
                    overrides = {}
                    if saldo_anterior is not None: overrides['saldo_anterior'] = saldo_anterior
                    if entradas is not None: overrides['entradas'] = entradas
                    if salidas is not None: overrides['salidas'] = salidas
                    if saldo_final is not None: overrides['saldo_final'] = saldo_final
                    if rendimientos is not None: overrides['rendimientos'] = rendimientos
                    if retenciones is not None: overrides['retenciones'] = retenciones
                    
                    return await service.procesar_extracto(f, filename, tipo_cuenta, cuenta_id, year, month, overrides=overrides)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error procesando archivo local: {str(e)}")
        
        
    # Re-route logic for extractos if needed
    if tipo not in ["movimientos", "extractos"]:
         raise HTTPException(status_code=400, detail="Tipo desconocido")
         
    return {"status": "ok"}

