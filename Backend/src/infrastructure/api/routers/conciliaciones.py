from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional
from datetime import date
from src.domain.models.conciliacion import Conciliacion
from src.domain.ports.conciliacion_repository import ConciliacionRepository
from src.infrastructure.api.dependencies import get_conciliacion_repository
from src.application.services.procesador_archivos_service import ProcesadorArchivosService
from fastapi import APIRouter, Depends, HTTPException, Body, File, UploadFile, Form
from src.infrastructure.api.routers.archivos import get_procesador_service
from pydantic import BaseModel
from decimal import Decimal

import logging
router = APIRouter(prefix="/api/conciliaciones", tags=["conciliaciones"])
logger = logging.getLogger(__name__)
print("DEBUG: Conciliaciones Router Module Loaded - vDebugger")

# --- Schemas ---
# (Podrían ir en src/infrastructure/api/schemas.py pero por simplicidad los dejo aqui por ahora)
class ConciliacionUpdate(BaseModel):
    cuenta_id: int
    year: int
    month: int
    fecha_corte: date
    extracto_saldo_anterior: Decimal
    extracto_entradas: Decimal
    extracto_salidas: Decimal
    extracto_saldo_final: Decimal
    datos_extra: Optional[dict] = {}
    
class ConciliacionResponse(BaseModel):
    id: Optional[int]
    cuenta_id: int
    year: int
    month: int
    fecha_corte: date
    extracto_saldo_anterior: float
    extracto_entradas: float
    extracto_salidas: float
    extracto_saldo_final: float
    sistema_entradas: float
    sistema_salidas: float
    sistema_saldo_final: float
    diferencia_saldo: Optional[float]
    datos_extra: dict
    estado: str
    cuenta_nombre: Optional[str] = None
    
    class Config:
        from_attributes = True

# --- Endpoints ---

@router.get("/{cuenta_id}/{year}/{month}", response_model=ConciliacionResponse)
def obtener_conciliacion(
    cuenta_id: int, 
    year: int, 
    month: int,
    repo: ConciliacionRepository = Depends(get_conciliacion_repository)
):
    conciliacion = repo.obtener_por_periodo(cuenta_id, year, month)
    if not conciliacion:
        # Intentar obtener el saldo final del mes anterior para pre-llenar
        prev_year = year
        prev_month = month - 1
        if prev_month == 0:
            prev_month = 12
            prev_year = year - 1
            
        prev_conciliacion = repo.obtener_por_periodo(cuenta_id, prev_year, prev_month)
        saldo_anterior_sugerido = prev_conciliacion.extracto_saldo_final if prev_conciliacion else 0

        # Retornar una vacía o 404? 
        # Mejor retornar vacía con datos en 0 para que el frontend la llene
        return ConciliacionResponse(
            id=None,
            cuenta_id=cuenta_id, 
            year=year, 
            month=month,
            fecha_corte=date(year, month, 1), # Default provisional
            extracto_saldo_anterior=saldo_anterior_sugerido,
            extracto_entradas=0,
            extracto_salidas=0,
            extracto_saldo_final=saldo_anterior_sugerido, # provisional = saldo anterior
            sistema_entradas=0,
            sistema_salidas=0,
            sistema_saldo_final=0,
            diferencia_saldo=None,
            datos_extra={},
            estado="NUEVO"
        )
    return conciliacion

@router.post("/", response_model=ConciliacionResponse)
def guardar_conciliacion(
    data: ConciliacionUpdate,
    repo: ConciliacionRepository = Depends(get_conciliacion_repository)
):
    # Convertir de Pydantic a Domain Model
    conciliacion = Conciliacion(
        id=None, # Lo asigna el repo
        cuenta_id=data.cuenta_id,
        year=data.year,
        month=data.month,
        fecha_corte=data.fecha_corte,
        extracto_saldo_anterior=data.extracto_saldo_anterior,
        extracto_entradas=data.extracto_entradas,
        extracto_salidas=data.extracto_salidas,
        extracto_saldo_final=data.extracto_saldo_final,
        datos_extra=data.datos_extra,
        estado="PENDIENTE" # Reset estado al guardar cambios manuales
    )
    
    guardado = repo.guardar(conciliacion)
    
    # Auto-recalcular sistema al guardar?
    # Mejor que sea explicito o el repo podria hacerlo.
    # Vamos a invocar recalcular aqui mismo para devolver la foto completa
    try:
        final = repo.recalcular_sistema(data.cuenta_id, data.year, data.month)
        return final
    except Exception as e:
        # Si falla el recalculo, devolvemos lo guardado al menos
        return guardado

@router.post("/{cuenta_id}/{year}/{month}/recalcular", response_model=ConciliacionResponse)
def recalcular_conciliacion(
    cuenta_id: int, 
    year: int, 
    month: int,
    repo: ConciliacionRepository = Depends(get_conciliacion_repository)
):
    try:
        return repo.recalcular_sistema(cuenta_id, year, month)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/analizar-extracto")
async def analizar_extracto(
    file: UploadFile = File(...),
    tipo_cuenta: str = Form(...),
    service: ProcesadorArchivosService = Depends(get_procesador_service)
):
    """
    Analiza un PDF de extracto y retorna el resumen hallado (saldos).
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")

    try:
        # Usamos file.file directamente
        resultado = service.analizar_extracto(file.file, file.filename, tipo_cuenta)
        return resultado
    except ValueError as ve:
        # El extractor ya incluye detalles en el mensaje
        logger.error(f"Error de validación en extracción: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"Error NO CONTROLADO analizando extracto: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno analizando extracto: {str(e)}")

@router.post("/cargar-extracto")
async def cargar_extracto(
    file: UploadFile = File(...),
    tipo_cuenta: str = Form(...),
    cuenta_id: int = Form(...),
    year: Optional[int] = Form(None),
    month: Optional[int] = Form(None),
    service: ProcesadorArchivosService = Depends(get_procesador_service)
):
    """
    Carga un extracto y actualiza la conciliación del periodo.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")

    try:
        resultado = service.procesar_extracto(file.file, file.filename, tipo_cuenta, cuenta_id, year, month)
        return resultado
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error cargando extracto: {str(e)}")
