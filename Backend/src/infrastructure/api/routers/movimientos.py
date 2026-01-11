from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from src.infrastructure.logging.config import logger

from src.domain.models.movimiento import Movimiento
from src.domain.ports.movimiento_repository import MovimientoRepository
from src.domain.ports.cuenta_repository import CuentaRepository
from src.domain.ports.moneda_repository import MonedaRepository
from src.domain.ports.tercero_repository import TerceroRepository
from src.domain.ports.grupo_repository import GrupoRepository
from src.domain.ports.concepto_repository import ConceptoRepository

from src.infrastructure.api.dependencies import (
    get_movimiento_repository,
    get_cuenta_repository,
    get_moneda_repository,
    get_tercero_repository,
    get_grupo_repository,
    get_concepto_repository,
    get_config_valor_pendiente_repository
)
from src.domain.ports.config_valor_pendiente_repository import ConfigValorPendienteRepository

router = APIRouter(prefix="/api/movimientos", tags=["movimientos"])

class MovimientoDTO(BaseModel):
    fecha: date
    descripcion: str
    referencia: Optional[str] = ""
    valor: float
    usd: Optional[float] = None
    trm: Optional[float] = None
    moneda_id: int
    cuenta_id: int
    tercero_id: Optional[int] = None
    grupo_id: Optional[int] = None
    concepto_id: Optional[int] = None
    detalle: Optional[str] = None

class MovimientoResponse(BaseModel):
    id: int
    fecha: date
    descripcion: str
    referencia: str
    valor: float
    usd: Optional[float]
    trm: Optional[float]
    moneda_id: Optional[int]
    cuenta_id: Optional[int]
    tercero_id: Optional[int]
    grupo_id: Optional[int]
    concepto_id: Optional[int]
    created_at: Optional[datetime]
    detalle: Optional[str]
    # Campos de visualización en formato "id - descripción"
    cuenta_display: str
    moneda_display: str
    tercero_display: Optional[str]
    grupo_display: Optional[str]
    concepto_display: Optional[str]

class PaginatedMovimientosResponse(BaseModel):
    items: List[MovimientoResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    totales: dict  # Global totals: {ingresos, egresos, saldo}

def _to_response(mov: Movimiento) -> MovimientoResponse:
    """Convierte un Movimiento de dominio a MovimientoResponse con formato display"""
    return MovimientoResponse(
        id=mov.id,
        fecha=mov.fecha,
        descripcion=mov.descripcion,
        referencia=mov.referencia,
        valor=float(mov.valor),
        usd=float(mov.usd) if mov.usd else None,
        trm=float(mov.trm) if mov.trm else None,
        moneda_id=mov.moneda_id,
        cuenta_id=mov.cuenta_id,
        tercero_id=mov.tercero_id,
        grupo_id=mov.grupo_id,
        concepto_id=mov.concepto_id,
        created_at=mov.created_at,
        detalle=mov.detalle,
        cuenta_display=f"{mov.cuenta_id} - {mov.cuenta_nombre}" if mov.cuenta_id and mov.cuenta_nombre else (str(mov.cuenta_id) if mov.cuenta_id else "Sin Cuenta"),
        moneda_display=f"{mov.moneda_id} - {mov.moneda_nombre}" if mov.moneda_id and mov.moneda_nombre else (str(mov.moneda_id) if mov.moneda_id else "Sin Moneda"),
        tercero_display=f"{mov.tercero_id} - {mov.tercero_nombre}" if mov.tercero_id and mov.tercero_nombre else None,
        grupo_display=f"{mov.grupo_id} - {mov.grupo_nombre}" if mov.grupo_id and mov.grupo_nombre else None,
        concepto_display=f"{mov.concepto_id} - {mov.concepto_nombre}" if mov.concepto_id and mov.concepto_nombre else None
    )

def _validar_catalogos(
    dto: MovimientoDTO,
    repo_cuenta: CuentaRepository,
    repo_moneda: MonedaRepository,
    repo_tercero: TerceroRepository,
    repo_grupo: GrupoRepository,
    repo_concepto: ConceptoRepository
):
    """Valida que todos los IDs de catálogos existan y sean consistentes"""
    if not repo_cuenta.obtener_por_id(dto.cuenta_id):
        raise HTTPException(status_code=400, detail=f"Cuenta con ID {dto.cuenta_id} no existe")
    
    if not repo_moneda.obtener_por_id(dto.moneda_id):
        raise HTTPException(status_code=400, detail=f"Moneda con ID {dto.moneda_id} no existe")
    
    if dto.tercero_id and not repo_tercero.obtener_por_id(dto.tercero_id):
        raise HTTPException(status_code=400, detail=f"Tercero con ID {dto.tercero_id} no existe")
    
    if dto.grupo_id and not repo_grupo.obtener_por_id(dto.grupo_id):
        raise HTTPException(status_code=400, detail=f"Grupo con ID {dto.grupo_id} no existe")
    
    if dto.concepto_id:
        concepto = repo_concepto.obtener_por_id(dto.concepto_id)
        if not concepto:
            raise HTTPException(status_code=400, detail=f"Concepto con ID {dto.concepto_id} no existe")
        
        # Validar que el concepto pertenezca al grupo seleccionado (si hay grupo)
        if dto.grupo_id and concepto.grupoid_fk != dto.grupo_id:
             raise HTTPException(
                 status_code=400, 
                 detail=f"El concepto {dto.concepto_id} no pertenece al grupo {dto.grupo_id}"
             )

@router.get("", response_model=PaginatedMovimientosResponse)
def listar_movimientos(
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    cuenta_id: Optional[int] = None,
    tercero_id: Optional[int] = None,
    grupo_id: Optional[int] = None,
    concepto_id: Optional[int] = None,
    grupos_excluidos: Optional[List[int]] = Query(None),
    solo_pendientes: bool = False,
    tipo_movimiento: Optional[str] = None,
    repo: MovimientoRepository = Depends(get_movimiento_repository)
):
    """Lista todos los movimientos con filtros (sin paginación)."""
    logger.info(f"Listando todos los movimientos sin paginación")
    try:
        # Obtener TODOS los movimientos sin límites de paginación
        movimientos, total = repo.buscar_avanzado(
            fecha_inicio=desde,
            fecha_fin=hasta,
            cuenta_id=cuenta_id,
            tercero_id=tercero_id,
            grupo_id=grupo_id,
            concepto_id=concepto_id,
            grupos_excluidos=grupos_excluidos,
            solo_pendientes=solo_pendientes,
            tipo_movimiento=tipo_movimiento,
            skip=0,
            limit=None  # Sin límite - retornar todos
        )
        
        # Calcular totales globales
        ingresos = sum(float(m.valor) for m in movimientos if m.valor > 0)
        egresos = sum(abs(float(m.valor)) for m in movimientos if m.valor < 0)
        saldo = ingresos - egresos
        
        return PaginatedMovimientosResponse(
            items=[_to_response(m) for m in movimientos],
            total=total,
            page=1,  # Siempre página 1 (sin paginación)
            page_size=total,  # Tamaño = total de registros
            total_pages=1,  # Siempre 1 página
            totales={
                "ingresos": ingresos,
                "egresos": egresos,
                "saldo": saldo
            }
        )
    except Exception as e:
        logger.error(f"Error listando movimientos: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno al listar movimientos")

@router.get("/pendientes", response_model=List[MovimientoResponse])
def obtener_pendientes_dashboard(
    repo: MovimientoRepository = Depends(get_movimiento_repository),
    config_repo: ConfigValorPendienteRepository = Depends(get_config_valor_pendiente_repository)
):
    """Obtiene movimientos pendientes (igual que el anterior pero con URL compatible con Dashboard)"""
    # Obtener IDs de valores que semánticamente significan "pendiente"
    terceros_pendientes = config_repo.obtener_ids_por_tipo('tercero')
    grupos_pendientes = config_repo.obtener_ids_por_tipo('grupo')
    conceptos_pendientes = config_repo.obtener_ids_por_tipo('concepto')
    
    pendientes = repo.buscar_pendientes_clasificacion(
        terceros_pendientes=terceros_pendientes,
        grupos_pendientes=grupos_pendientes,
        conceptos_pendientes=conceptos_pendientes
    )
    return [_to_response(m) for m in pendientes]

@router.get("/pendientes/clasificacion", response_model=List[MovimientoResponse])
def obtener_pendientes_clasificacion(
    repo: MovimientoRepository = Depends(get_movimiento_repository),
    config_repo: ConfigValorPendienteRepository = Depends(get_config_valor_pendiente_repository)
):
    """Obtiene movimientos pendientes de clasificación (sin grupo o concepto o con valores 'Por Clasificar')"""
    # Obtener IDs de valores que semánticamente significan "pendiente"
    terceros_pendientes = config_repo.obtener_ids_por_tipo('tercero')
    grupos_pendientes = config_repo.obtener_ids_por_tipo('grupo')
    conceptos_pendientes = config_repo.obtener_ids_por_tipo('concepto')
    
    pendientes = repo.buscar_pendientes_clasificacion(
        terceros_pendientes=terceros_pendientes,
        grupos_pendientes=grupos_pendientes,
        conceptos_pendientes=conceptos_pendientes
    )
    return [_to_response(m) for m in pendientes]

@router.get("/{id}", response_model=MovimientoResponse)
def obtener_movimiento(id: int, repo: MovimientoRepository = Depends(get_movimiento_repository)):
    mov = repo.obtener_por_id(id)
    if not mov:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    return _to_response(mov)

@router.get("/reporte/clasificacion")
def reporte_clasificacion(
    tipo: str,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    cuenta_id: Optional[int] = None,
    tercero_id: Optional[int] = None,
    grupo_id: Optional[int] = None,
    concepto_id: Optional[int] = None,
    grupos_excluidos: Optional[List[int]] = Query(None),
    tipo_movimiento: Optional[str] = None,
    repo: MovimientoRepository = Depends(get_movimiento_repository)
):
    try:
        return repo.resumir_por_clasificacion(
            tipo_agrupacion=tipo,
            fecha_inicio=desde,
            fecha_fin=hasta,
            cuenta_id=cuenta_id,
            tercero_id=tercero_id,
            grupo_id=grupo_id,
            concepto_id=concepto_id,
            grupos_excluidos=grupos_excluidos,
            tipo_movimiento=tipo_movimiento
        )
    except Exception as e:
        logger.error(f"Error generando reporte: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error generando reporte")

@router.get("/reporte/ingresos-gastos-mes")
def reporte_ingresos_gastos_mes(
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    cuenta_id: Optional[int] = None,
    tercero_id: Optional[int] = None,
    grupo_id: Optional[int] = None,
    concepto_id: Optional[int] = None,
    grupos_excluidos: Optional[List[int]] = Query(None),
    repo: MovimientoRepository = Depends(get_movimiento_repository)
):
    try:
        return repo.resumir_ingresos_gastos_por_mes(
            fecha_inicio=desde,
            fecha_fin=hasta,
            cuenta_id=cuenta_id,
            tercero_id=tercero_id,
            grupo_id=grupo_id,
            concepto_id=concepto_id,
            grupos_excluidos=grupos_excluidos
        )
    except Exception as e:
        logger.error(f"Error generando reporte mensual: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error generando reporte mensual")

@router.get("/reporte/desglose-gastos")
def reporte_desglose_gastos(
    nivel: str,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    cuenta_id: Optional[int] = None,
    tercero_id: Optional[int] = None,
    grupo_id: Optional[int] = None,
    concepto_id: Optional[int] = None,
    grupos_excluidos: Optional[List[int]] = Query(None),
    repo: MovimientoRepository = Depends(get_movimiento_repository)
):
    try:
        return repo.obtener_desglose_gastos(
            nivel=nivel,
            fecha_inicio=desde,
            fecha_fin=hasta,
            cuenta_id=cuenta_id,
            tercero_id=tercero_id,
            grupo_id=grupo_id,
            concepto_id=concepto_id,
            grupos_excluidos=grupos_excluidos
        )
    except Exception as e:
        logger.error(f"Error generando reporte desglose: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error generando reporte")

@router.post("", response_model=MovimientoResponse)
def crear_movimiento(
    dto: MovimientoDTO, 
    repo: MovimientoRepository = Depends(get_movimiento_repository),
    repo_cuenta: CuentaRepository = Depends(get_cuenta_repository),
    repo_moneda: MonedaRepository = Depends(get_moneda_repository),
    repo_tercero: TerceroRepository = Depends(get_tercero_repository),
    repo_grupo: GrupoRepository = Depends(get_grupo_repository),
    repo_concepto: ConceptoRepository = Depends(get_concepto_repository)
):
    logger.info(f"Creando nuevo movimiento: {dto.descripcion} por {dto.valor}")
    _validar_catalogos(dto, repo_cuenta, repo_moneda, repo_tercero, repo_grupo, repo_concepto)
    
    nuevo = Movimiento(
        id=None,
        fecha=dto.fecha,
        descripcion=dto.descripcion,
        referencia=dto.referencia or "",
        valor=Decimal(str(dto.valor)),
        usd=Decimal(str(dto.usd)) if dto.usd else None,
        trm=Decimal(str(dto.trm)) if dto.trm else None,
        moneda_id=dto.moneda_id,
        cuenta_id=dto.cuenta_id,
        tercero_id=dto.tercero_id,
        grupo_id=dto.grupo_id,
        concepto_id=dto.concepto_id,
        detalle=dto.detalle
    )
    try:
        guardado = repo.guardar(nuevo)
        logger.info(f"Movimiento guardado con ID {guardado.id}")
        # Recargar para obtener los nombres de las relaciones
        guardado = repo.obtener_por_id(guardado.id)
        return _to_response(guardado)
    except Exception as e:
        logger.error(f"Error al guardar movimiento: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}", response_model=MovimientoResponse)
def actualizar_movimiento(
    id: int, 
    dto: MovimientoDTO, 
    repo: MovimientoRepository = Depends(get_movimiento_repository),
    repo_cuenta: CuentaRepository = Depends(get_cuenta_repository),
    repo_moneda: MonedaRepository = Depends(get_moneda_repository),
    repo_tercero: TerceroRepository = Depends(get_tercero_repository),
    repo_grupo: GrupoRepository = Depends(get_grupo_repository),
    repo_concepto: ConceptoRepository = Depends(get_concepto_repository)
):
    existente = repo.obtener_por_id(id)
    if not existente:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    
    _validar_catalogos(dto, repo_cuenta, repo_moneda, repo_tercero, repo_grupo, repo_concepto)
    
    actualizado = Movimiento(
        id=id,
        fecha=dto.fecha,
        descripcion=dto.descripcion,
        referencia=dto.referencia or "",
        valor=Decimal(str(dto.valor)),
        usd=Decimal(str(dto.usd)) if dto.usd else None,
        trm=Decimal(str(dto.trm)) if dto.trm else None,
        moneda_id=dto.moneda_id,
        cuenta_id=dto.cuenta_id,
        tercero_id=dto.tercero_id,
        grupo_id=dto.grupo_id,
        concepto_id=dto.concepto_id,
        detalle=dto.detalle
    )
    try:
        guardado = repo.guardar(actualizado)
        # Recargar para obtener los nombres
        guardado = repo.obtener_por_id(guardado.id)
        return _to_response(guardado)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/exportar/datos", response_model=List[dict])
def obtener_datos_exportacion(
    limit: Optional[int] = None,
    plain: bool = False,
    repo: MovimientoRepository = Depends(get_movimiento_repository)
):
    """
    Retorna los datos crudos para la exportación.
    Si limit es None, trae todo.
    Si plain es True, trae solo la tabla movimientos sin los nombres de FKs.
    """
    try:
        logger.info(f"Solicitud de exportación - Limit: {limit}, Plain: {plain}")
        return repo.obtener_datos_exportacion(limit=limit, plain_format=plain)
    except Exception as e:
        logger.error(f"Error exportando datos: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error obteniendo datos para exportación")
class ReclasificacionRequest(BaseModel):
    tercero_id: int
    grupo_id: Optional[int] = None
    concepto_id: Optional[int] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    movimiento_ids: Optional[List[int]] = None

@router.get("/sugerencias/reclasificacion", response_model=List[dict])
def obtener_sugerencias_reclasificacion(
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    repo: MovimientoRepository = Depends(get_movimiento_repository)
):
    """
    Obtiene sugerencias de grupos de movimientos para reclasificar como traslados.
    """
    try:
        return repo.obtener_sugerencias_reclasificacion(fecha_inicio=desde, fecha_fin=hasta)
    except Exception as e:
        logger.error(f"Error obteniendo sugerencias: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error obteniendo sugerencias de reclasificación")

@router.get("/sugerencias/detalles", response_model=List[MovimientoResponse])
def obtener_detalles_sugerencia(
    tercero_id: int,
    grupo_id: Optional[int] = None,
    concepto_id: Optional[int] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    repo: MovimientoRepository = Depends(get_movimiento_repository)
):
    """
    Obtiene los movimientos individuales de un grupo sugerido.
    """
    try:
        movimientos = repo.obtener_movimientos_grupo(
            tercero_id=tercero_id, 
            grupo_id=grupo_id, 
            concepto_id=concepto_id,
            fecha_inicio=desde,
            fecha_fin=hasta
        )
        return [_to_response(m) for m in movimientos]
    except Exception as e:
        logger.error(f"Error obteniendo detalles de sugerencia: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error obteniendo detalles")

@router.post("/reclasificar-lote")
def reclasificar_lote(
    request: ReclasificacionRequest,
    repo: MovimientoRepository = Depends(get_movimiento_repository)
):
    """
    Reclasifica todos los movimientos del grupo especificado a Traslado.
    """
    try:
        afectados = repo.reclasificar_movimientos_grupo(
            tercero_id=request.tercero_id,
            grupo_id_anterior=request.grupo_id,
            concepto_id_anterior=request.concepto_id,
            fecha_inicio=request.fecha_inicio,
            fecha_fin=request.fecha_fin,
            movimiento_ids=request.movimiento_ids
        )
        return {"mensaje": "Reclasificación exitosa", "registros_actualizados": afectados}
    except Exception as e:
        logger.error(f"Error reclasificando lote: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error reclasificando movimientos")

@router.get("/configuracion/filtros-exclusion")
def obtener_configuracion_filtros_exclusion(
    repo_grupo: GrupoRepository = Depends(get_grupo_repository)
):
    """
    Retorna la configuración de grupos que deben aparecer como checkboxes de exclusión.
    """
    try:
        return repo_grupo.obtener_filtros_exclusion()
    except Exception as e:
        logger.error(f"Error obteniendo configuracion filtros: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error obteniendo configuracion")
