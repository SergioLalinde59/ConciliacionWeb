from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
import calendar

from src.domain.models.movimiento import Movimiento
from src.domain.models.movimiento_match import MovimientoMatch, MatchEstado
from src.domain.models.configuracion_matching import ConfiguracionMatching
from src.domain.models.matching_alias import MatchingAlias
from src.domain.ports.movimiento_vinculacion_repository import MovimientoVinculacionRepository
from src.domain.ports.configuracion_matching_repository import ConfiguracionMatchingRepository
from src.domain.ports.movimiento_extracto_repository import MovimientoExtractoRepository
from src.domain.ports.movimiento_repository import MovimientoRepository
from src.domain.ports.matching_alias_repository import MatchingAliasRepository
from src.domain.services.matching_service import MatchingService

from src.infrastructure.api.dependencies import (
    get_movimiento_vinculacion_repository,
    get_configuracion_matching_repository,
    get_matching_service,
    get_movimiento_extracto_repository,
    get_movimiento_repository,
    get_matching_alias_repository
)

from src.infrastructure.logging.config import logger

router = APIRouter(prefix="/api/matching", tags=["matching"])

# --- Schemas ---

class MovimientoMatchResponse(BaseModel):
    id: Optional[int]
    mov_extracto: dict
    mov_sistema: Optional[dict]
    estado: str
    score_total: float
    score_fecha: float
    score_valor: float
    score_descripcion: float
    confirmado_por_usuario: bool
    created_by: Optional[str]
    notas: Optional[str]

class MatchingResultResponse(BaseModel):
    matches: List[MovimientoMatchResponse]
    estadisticas: dict

class VincularRequest(BaseModel):
    movimiento_extracto_id: int
    movimiento_id: int
    usuario: str
    notas: Optional[str] = None

class DesvincularRequest(BaseModel):
    movimiento_extracto_id: int

class IgnorarRequest(BaseModel):
    movimiento_extracto_id: int
    usuario: str
    razon: Optional[str] = None

class ConfiguracionMatchingResponse(BaseModel):
    id: Optional[int]
    tolerancia_valor: float
    similitud_descripcion_minima: float
    peso_fecha: float
    peso_valor: float
    peso_descripcion: float
    score_minimo_exacto: float
    score_minimo_probable: float
    activo: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

class ConfiguracionMatchingUpdate(BaseModel):
    tolerancia_valor: float
    similitud_descripcion_minima: float
    peso_fecha: float
    peso_valor: float
    peso_descripcion: float
    score_minimo_exacto: float
    score_minimo_probable: float


class CrearMovimientoItem(BaseModel):
    movimiento_extracto_id: int
    fecha: Optional[date] = None
    descripcion: Optional[str] = None
    # Los movimientos creados entrarán como pendientes (sin clasificación)

class CrearMovimientosLoteResponse(BaseModel):
    creados: int
    errores: List[str]

class MatchingAliasResponse(BaseModel):
    id: int
    cuenta_id: int
    patron: str
    reemplazo: str
    created_at: Optional[datetime]

class MatchingAliasCreate(BaseModel):
    cuenta_id: int
    patron: str
    reemplazo: str

class MatchingAliasUpdate(BaseModel):
    patron: str
    reemplazo: str

# ... existing imports ...
from src.domain.models.movimiento import Movimiento

@router.post("/crear-movimientos-lote", response_model=CrearMovimientosLoteResponse)
def crear_movimientos_lote(
    items: List[CrearMovimientoItem],
    repo_extracto: MovimientoExtractoRepository = Depends(get_movimiento_extracto_repository),
    repo_sistema: MovimientoRepository = Depends(get_movimiento_repository),
    vinculacion_repo: MovimientoVinculacionRepository = Depends(get_movimiento_vinculacion_repository),
    matching_service: MatchingService = Depends(get_matching_service),
    config_repo: ConfiguracionMatchingRepository = Depends(get_configuracion_matching_repository)
):
    """
    Crea movimientos en el sistema basados en movimientos del extracto (Sin Match).
    
    Útil para legalizar notas débito/crédito, comisiones, etc. que aparecen en el extracto
    pero no fueron registradas en el sistema.
    """
    creados_count = 0
    errores = []
    
    for item in items:
        try:
            # 1. Obtener movimiento del extracto
            mov_extracto = repo_extracto.obtener_por_id(item.movimiento_extracto_id)
            if not mov_extracto:
                errores.append(f"ID {item.movimiento_extracto_id}: No encontrado en extracto")
                continue
            
            # 2. Verificar si ya existe el movimiento en el sistema (Duplicado)
            # Esto evita crear movimientos repetidos si el usuario hace clic varias veces o si ya existen.
            mov_sistema_existente = repo_sistema.obtener_exacto(
                cuenta_id=mov_extracto.cuenta_id,
                fecha=item.fecha or mov_extracto.fecha,
                valor=mov_extracto.valor,
                referencia=mov_extracto.referencia,
                descripcion=item.descripcion or mov_extracto.descripcion
            )

            if mov_sistema_existente:
                # Si existe, lo usamos
                mov_creado = mov_sistema_existente
                logger.info(f"Movimiento existente encontrado ID {mov_creado.id}, reutilizando.")
            else:
                # Si no existe, lo creamos
                nuevo_mov = Movimiento(
                    id=None,
                    fecha=item.fecha or mov_extracto.fecha,
                    descripcion=item.descripcion or mov_extracto.descripcion,
                    referencia=mov_extracto.referencia or "",
                    valor=mov_extracto.valor,
                    usd=mov_extracto.usd,
                    trm=mov_extracto.trm,
                    moneda_id=1, # Por defecto COP, TODO: Inferir de cuenta o movimiento
                    cuenta_id=mov_extracto.cuenta_id,
                    # Campos de clasificación vacíos = Pendiente
                    tercero_id=None,
                    centro_costo_id=None,
                    concepto_id=None,
                    detalle="Creado desde conciliación"
                )
                mov_creado = repo_sistema.guardar(nuevo_mov)
                if mov_creado and mov_creado.id:
                    creados_count += 1
            
            if mov_creado and mov_creado.id:
                # 4. Auto-vincular (Matching Manual Inmediato)
                # Verificar si ya existe una vinculación (ej: SIN_MATCH) para actualizarla
                existing_match = vinculacion_repo.obtener_por_extracto_id(item.movimiento_extracto_id)
                match_id = existing_match.id if existing_match else None
                created_at = existing_match.created_at if existing_match else None

                # Calcular scores
                config = config_repo.obtener_activa()
                score_fecha = matching_service.calcular_score_fecha(mov_extracto.fecha, mov_creado.fecha)
                score_valor = matching_service.calcular_score_valor(
                    mov_extracto.valor, 
                    mov_creado.valor, 
                    config.tolerancia_valor
                )
                score_descripcion = matching_service.calcular_score_descripcion(
                    mov_extracto.descripcion, 
                    mov_creado.descripcion
                )
                score_total = config.calcular_score_ponderado(score_fecha, score_valor, score_descripcion)
                
                match = MovimientoMatch(
                    id=match_id,
                    mov_extracto=mov_extracto,
                    mov_sistema=mov_creado,
                    estado=MatchEstado.EXACTO, # Siempre Exacto al crear/vincular explícitamente
                    score_total=score_total,
                    score_fecha=score_fecha,
                    score_valor=score_valor,
                    score_descripcion=score_descripcion,
                    confirmado_por_usuario=True,
                    created_by="sistema", 
                    notas="Creado/Vinculado desde extracto",
                    created_at=created_at
                )
                vinculacion_repo.guardar(match)
            else:
                errores.append(f"ID {item.movimiento_extracto_id}: Error al guardar movimiento")

        except Exception as e:
            logger.error(f"Error procesando item {item.movimiento_extracto_id}: {e}")
            errores.append(f"ID {item.movimiento_extracto_id}: {str(e)}")
            
    return {"creados": creados_count, "errores": errores}


def _movimiento_extracto_to_dict(mov) -> dict:
    """Convierte MovimientoExtracto a dict para JSON"""
    return {
        'id': mov.id,
        'fecha': str(mov.fecha),
        'descripcion': mov.descripcion,
        'referencia': mov.referencia,
        'valor': float(mov.valor),
        'usd': float(mov.usd) if mov.usd is not None else None,
        'trm': float(mov.trm) if mov.trm is not None else None,
        'cuenta_id': mov.cuenta_id
    }

def _movimiento_sistema_to_dict(mov) -> dict:
    """Convierte Movimiento a dict para JSON"""
    return {
        'id': mov.id,
        'fecha': str(mov.fecha),
        'descripcion': mov.descripcion,
        'referencia': mov.referencia,
        'valor': float(mov.valor),
        'usd': float(mov.usd) if mov.usd is not None else None,
        'trm': float(mov.trm) if mov.trm is not None else None,
        'cuenta_id': mov.cuenta_id,
        'tercero_id': mov.tercero_id,
        'tercero_nombre': mov.tercero_nombre,
        'centro_costo_id': mov.centro_costo_id,
        'centro_costo_nombre': mov.centro_costo_nombre,
        'concepto_id': mov.concepto_id,
        'concepto_nombre': mov.concepto_nombre
    }

def _match_to_response(match: MovimientoMatch) -> MovimientoMatchResponse:
    """Convierte MovimientoMatch a MovimientoMatchResponse"""
    return MovimientoMatchResponse(
        id=match.id,
        mov_extracto=_movimiento_extracto_to_dict(match.mov_extracto),
        mov_sistema=_movimiento_sistema_to_dict(match.mov_sistema) if match.mov_sistema else None,
        estado=match.estado.value,
        score_total=float(match.score_total),
        score_fecha=float(match.score_fecha),
        score_valor=float(match.score_valor),
        score_descripcion=float(match.score_descripcion),
        confirmado_por_usuario=match.confirmado_por_usuario,
        created_by=match.created_by,
        notas=match.notas
    )

# --- Endpoints ---

@router.get("/{cuenta_id}/{year}/{month}", response_model=MatchingResultResponse)
def ejecutar_matching(
    cuenta_id: int,
    year: int,
    month: int,
    matching_service: MatchingService = Depends(get_matching_service),
    repo_extracto: MovimientoExtractoRepository = Depends(get_movimiento_extracto_repository),
    repo_sistema: MovimientoRepository = Depends(get_movimiento_repository),
    vinculacion_repo: MovimientoVinculacionRepository = Depends(get_movimiento_vinculacion_repository),
    config_repo: ConfiguracionMatchingRepository = Depends(get_configuracion_matching_repository),
    alias_repo: MatchingAliasRepository = Depends(get_matching_alias_repository)
):
    """
    Ejecuta el algoritmo de matching para un periodo específico.
    
    Compara movimientos del extracto bancario con movimientos del sistema
    y retorna las vinculaciones encontradas con sus scores de similitud.
    """
    try:
        logger.info(f"Ejecutando matching para cuenta {cuenta_id}, periodo {year}/{month}")
        
        # 1. Obtener configuración activa
        config = config_repo.obtener_activa()
        
        # 2. Obtener movimientos del extracto
        movs_extracto = repo_extracto.obtener_por_periodo(cuenta_id, year, month)
        logger.info(f"Encontrados {len(movs_extracto)} movimientos en extracto")
        
        # 3. Obtener movimientos del sistema
        ultimo_dia = calendar.monthrange(year, month)[1]
        movs_sistema, _ = repo_sistema.buscar_avanzado(
            fecha_inicio=date(year, month, 1),
            fecha_fin=date(year, month, ultimo_dia),
            cuenta_id=cuenta_id
        )
        logger.info(f"Encontrados {len(movs_sistema)} movimientos en sistema")

        # 3.1 Obtener vinculaciones existentes en DB
        matches_existentes = vinculacion_repo.obtener_por_periodo(cuenta_id, year, month)
        
        # Identificar y limpiar "orphans" (matches que apuntan a movimientos de sistema borrados)
        matches_validos = []
        for match in matches_existentes:
            es_huerfano = False
            # Si el estado implica que debería haber un movimiento de sistema...
            if match.estado in [MatchEstado.EXACTO, MatchEstado.PROBABLE, MatchEstado.MANUAL]:
                # ...pero no hay movimiento de sistema asociado
                if not match.mov_sistema:
                    es_huerfano = True
            
            if es_huerfano:
                logger.warning(f"Detectado match huérfano ID {match.id} (Estado {match.estado.value}, Extracto {match.mov_extracto.id}). Eliminando...")
                vinculacion_repo.eliminar(match.id)
                # No lo agregamos a matches_validos, así el extracto quedará libre para ser procesado de nuevo
            else:
                matches_validos.append(match)

        matches_map = {m.mov_extracto.id: m for m in matches_validos}
        
        # Identificar items ya procesados y sistemas ocupados
        extracto_ids_procesados = set(matches_map.keys())
        sistema_ids_ocupados = {m.mov_sistema.id for m in matches_validos if m.mov_sistema}
        
        # Filtrar pendientes
        movs_extracto_pendientes = [m for m in movs_extracto if m.id not in extracto_ids_procesados]
        movs_sistema_disponibles = [m for m in movs_sistema if m.id not in sistema_ids_ocupados]

        logger.info(f"Procesando {len(movs_extracto_pendientes)} items pendientes y {len(movs_sistema_disponibles)} sistemas disponibles")
        
        # 3.2 Obtener reglas de normalización (Alias)
        aliases = alias_repo.obtener_por_cuenta(cuenta_id)
        
        # 4. Ejecutar algoritmo de matching solo en pendientes
        matches_nuevos = matching_service.ejecutar_matching(
            movs_extracto_pendientes, 
            movs_sistema_disponibles, 
            config,
            aliases=aliases
        )
        logger.info(f"Matching completado: {len(matches_nuevos)} vinculaciones nuevas generadas")
        
        # 5. Guardar vinculaciones nuevas (solo las automáticas relevantes)
        for match in matches_nuevos:
             # Guardamos incluso SIN_MATCH para evitar re-procesar? 
             # No, SIN_MATCH no se suele guardar en DB a menos que queramos 'cachear' el fallo.
             # Pero si no lo guardamos, la próxima vez se re-calcula.
             # La lógica original guardaba EXACTO y PROBABLE.
            if match.estado in [MatchEstado.EXACTO, MatchEstado.PROBABLE]:
                try:
                    match_guardado = vinculacion_repo.guardar(match)
                    # Actualizar ID generado
                    match.id = match_guardado.id
                    match.created_at = match_guardado.created_at
                except Exception as e:
                    logger.warning(f"Error guardando vinculación: {e}")
        
        # 6. Combinar resultados (Existentes + Nuevos)
        # Para items que dieron SIN_MATCH en 'matches_nuevos', no se guardaron, pero se devuelven.
        matches_finales = list(matches_map.values()) + matches_nuevos

        # 7. Calcular estadísticas
        estadisticas = {
            'total_extracto': len(movs_extracto),
            'total_sistema': len(movs_sistema),
            'exactos': sum(1 for m in matches_finales if m.estado == MatchEstado.EXACTO),
            'probables': sum(1 for m in matches_finales if m.estado == MatchEstado.PROBABLE),
            'sin_match': sum(1 for m in matches_finales if m.estado == MatchEstado.SIN_MATCH),
            'ignorados': sum(1 for m in matches_finales if m.estado == MatchEstado.IGNORADO)
        }
        
        # 8. Retornar respuesta
        # Ordenar por fecha y valor para consistencia visual
        matches_finales.sort(key=lambda m: (m.mov_extracto.fecha, abs(m.mov_extracto.valor)), reverse=True)

        return MatchingResultResponse(
            matches=[_match_to_response(m) for m in matches_finales],
            estadisticas=estadisticas
        )
        
    except ValueError as ve:
        logger.error(f"Error de validación en matching: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error ejecutando matching: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error interno ejecutando matching: {str(e)}")


@router.post("/vincular", response_model=MovimientoMatchResponse)
def vincular_manual(
    request: VincularRequest,
    matching_service: MatchingService = Depends(get_matching_service),
    repo_extracto: MovimientoExtractoRepository = Depends(get_movimiento_extracto_repository),
    repo_sistema: MovimientoRepository = Depends(get_movimiento_repository),
    vinculacion_repo: MovimientoVinculacionRepository = Depends(get_movimiento_vinculacion_repository),
    config_repo: ConfiguracionMatchingRepository = Depends(get_configuracion_matching_repository)
):
    """
    Vincula manualmente un movimiento del extracto con uno del sistema.
    
    Crea una vinculación con estado EXACTO y calcula los scores de similitud.
    """
    try:
        logger.info(f"Vinculación manual: extracto {request.movimiento_extracto_id} -> sistema {request.movimiento_id}")
        
        # 1. Validar que existan ambos movimientos
        mov_extracto = repo_extracto.obtener_por_id(request.movimiento_extracto_id)
        if not mov_extracto:
            raise HTTPException(
                status_code=404, 
                detail=f"Movimiento del extracto {request.movimiento_extracto_id} no encontrado"
            )
        
        mov_sistema = repo_sistema.obtener_por_id(request.movimiento_id)
        if not mov_sistema:
            raise HTTPException(
                status_code=404,
                detail=f"Movimiento del sistema {request.movimiento_id} no encontrado"
            )
        
        # 2. Obtener configuración para calcular scores
        config = config_repo.obtener_activa()
        
        # 3. Calcular scores (aunque sea manual, es útil para auditoría)
        score_fecha = matching_service.calcular_score_fecha(mov_extracto.fecha, mov_sistema.fecha)
        score_valor = matching_service.calcular_score_valor(
            mov_extracto.valor, 
            mov_sistema.valor, 
            config.tolerancia_valor
        )
        score_descripcion = matching_service.calcular_score_descripcion(
            mov_extracto.descripcion, 
            mov_sistema.descripcion
        )
        score_total = config.calcular_score_ponderado(score_fecha, score_valor, score_descripcion)
        
        # 4. Crear vinculación EXACTO (Usuario confirmó)
        # Verificar si ya existe una vinculación para este extracto (ej. PROBABLE)
        existing_match = vinculacion_repo.obtener_por_extracto_id(request.movimiento_extracto_id)
        match_id = existing_match.id if existing_match else None
        created_at = existing_match.created_at if existing_match else None

        match = MovimientoMatch(
            id=match_id,
            mov_extracto=mov_extracto,
            mov_sistema=mov_sistema,
            estado=MatchEstado.EXACTO, # Usuario request: "deben quedar marcados como Exacto"
            score_total=score_total,
            score_fecha=score_fecha,
            score_valor=score_valor,
            score_descripcion=score_descripcion,
            confirmado_por_usuario=True,
            created_by=request.usuario,
            notas=request.notas,
            created_at=created_at
        )
        
        # 5. Guardar
        match_guardado = vinculacion_repo.guardar(match)
        logger.info(f"Vinculación manual guardada con ID {match_guardado.id}")
        
        return _match_to_response(match_guardado)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en vinculación manual: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error vinculando movimientos: {str(e)}")


@router.post("/desvincular")
def desvincular(
    request: DesvincularRequest,
    vinculacion_repo: MovimientoVinculacionRepository = Depends(get_movimiento_vinculacion_repository)
):
    """
    Elimina una vinculación existente.
    
    Permite al usuario deshacer una vinculación automática o manual.
    """
    try:
        logger.info(f"Desvinculando movimiento extracto {request.movimiento_extracto_id}")
        
        vinculacion_repo.desvincular(request.movimiento_extracto_id)
        
        return {
            "mensaje": "Vinculación eliminada exitosamente",
            "movimiento_extracto_id": request.movimiento_extracto_id
        }
        
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error desvinculando: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error eliminando vinculación: {str(e)}")


@router.post("/ignorar", response_model=MovimientoMatchResponse)
def ignorar_movimiento(
    request: IgnorarRequest,
    repo_extracto: MovimientoExtractoRepository = Depends(get_movimiento_extracto_repository),
    vinculacion_repo: MovimientoVinculacionRepository = Depends(get_movimiento_vinculacion_repository)
):
    """
    Marca un movimiento del extracto como ignorado.
    
    Útil para movimientos duplicados o irrelevantes que no deben vincularse.
    """
    try:
        logger.info(f"Ignorando movimiento extracto {request.movimiento_extracto_id}")
        
        # 1. Validar que exista el movimiento
        mov_extracto = repo_extracto.obtener_por_id(request.movimiento_extracto_id)
        if not mov_extracto:
            raise HTTPException(
                status_code=404,
                detail=f"Movimiento del extracto {request.movimiento_extracto_id} no encontrado"
            )
        
        # 2. Crear vinculación IGNORADO
        match = MovimientoMatch(
            mov_extracto=mov_extracto,
            mov_sistema=None,
            estado=MatchEstado.IGNORADO,
            score_total=Decimal('0.00'),
            score_fecha=Decimal('0.00'),
            score_valor=Decimal('0.00'),
            score_descripcion=Decimal('0.00'),
            confirmado_por_usuario=True,
            created_by=request.usuario,
            notas=request.razon
        )
        
        # 3. Guardar
        match_guardado = vinculacion_repo.guardar(match)
        logger.info(f"Movimiento marcado como ignorado con ID {match_guardado.id}")
        
        return _match_to_response(match_guardado)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ignorando movimiento: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error marcando como ignorado: {str(e)}")


@router.get("/configuracion", response_model=ConfiguracionMatchingResponse)
def obtener_configuracion(
    config_repo: ConfiguracionMatchingRepository = Depends(get_configuracion_matching_repository)
):
    """
    Obtiene la configuración activa del algoritmo de matching.
    
    Retorna los parámetros configurables como tolerancias, pesos y scores mínimos.
    """
    try:
        config = config_repo.obtener_activa()
        
        return ConfiguracionMatchingResponse(
            id=config.id,
            tolerancia_valor=float(config.tolerancia_valor),
            similitud_descripcion_minima=float(config.similitud_descripcion_minima),
            peso_fecha=float(config.peso_fecha),
            peso_valor=float(config.peso_valor),
            peso_descripcion=float(config.peso_descripcion),
            score_minimo_exacto=float(config.score_minimo_exacto),
            score_minimo_probable=float(config.score_minimo_probable),
            activo=config.activo,
            created_at=config.created_at,
            updated_at=config.updated_at
        )
        
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error obteniendo configuración: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error obteniendo configuración: {str(e)}")


@router.put("/configuracion", response_model=ConfiguracionMatchingResponse)
def actualizar_configuracion(
    update: ConfiguracionMatchingUpdate,
    config_repo: ConfiguracionMatchingRepository = Depends(get_configuracion_matching_repository)
):
    """
    Actualiza la configuración del algoritmo de matching.
    
    Permite ajustar parámetros como tolerancias, pesos y scores mínimos.
    Las validaciones se realizan automáticamente en el modelo de dominio.
    """
    try:
        logger.info("Actualizando configuración de matching")
        
        # 1. Obtener configuración activa
        config = config_repo.obtener_activa()
        
        # 2. Actualizar valores
        config.tolerancia_valor = Decimal(str(update.tolerancia_valor))
        config.similitud_descripcion_minima = Decimal(str(update.similitud_descripcion_minima))
        config.peso_fecha = Decimal(str(update.peso_fecha))
        config.peso_valor = Decimal(str(update.peso_valor))
        config.peso_descripcion = Decimal(str(update.peso_descripcion))
        config.score_minimo_exacto = Decimal(str(update.score_minimo_exacto))
        config.score_minimo_probable = Decimal(str(update.score_minimo_probable))
        
        # 3. Guardar (las validaciones se ejecutan en __post_init__ del modelo)
        config_actualizada = config_repo.actualizar(config)
        logger.info(f"Configuración actualizada: ID {config_actualizada.id}")
        
        return ConfiguracionMatchingResponse(
            id=config_actualizada.id,
            tolerancia_valor=float(config_actualizada.tolerancia_valor),
            similitud_descripcion_minima=float(config_actualizada.similitud_descripcion_minima),
            peso_fecha=float(config_actualizada.peso_fecha),
            peso_valor=float(config_actualizada.peso_valor),
            peso_descripcion=float(config_actualizada.peso_descripcion),
            score_minimo_exacto=float(config_actualizada.score_minimo_exacto),
            score_minimo_probable=float(config_actualizada.score_minimo_probable),
            activo=config_actualizada.activo,
            created_at=config_actualizada.created_at,
            updated_at=config_actualizada.updated_at
        )
        
    except ValueError as ve:
        # Errores de validación del modelo de dominio
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error actualizando configuración: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error actualizando configuración: {str(e)}")


# --- Endpoints Alias ---

@router.get("/alias/{cuenta_id}", response_model=List[MatchingAliasResponse])
def listar_aliases(
    cuenta_id: int,
    alias_repo: MatchingAliasRepository = Depends(get_matching_alias_repository)
):
    try:
        aliases = alias_repo.obtener_por_cuenta(cuenta_id)
        return [
            MatchingAliasResponse(
                id=a.id,
                cuenta_id=a.cuenta_id,
                patron=a.patron,
                reemplazo=a.reemplazo,
                created_at=a.created_at
            ) for a in aliases
        ]
    except Exception as e:
        logger.error(f"Error listando aliases: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/alias", response_model=MatchingAliasResponse)
def crear_alias(
    item: MatchingAliasCreate,
    alias_repo: MatchingAliasRepository = Depends(get_matching_alias_repository)
):
    try:
        alias = MatchingAlias(
            cuenta_id=item.cuenta_id,
            patron=item.patron,
            reemplazo=item.reemplazo
        )
        guardado = alias_repo.guardar(alias)
        return MatchingAliasResponse(
            id=guardado.id,
            cuenta_id=guardado.cuenta_id,
            patron=guardado.patron,
            reemplazo=guardado.reemplazo,
            created_at=guardado.created_at
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error creando alias: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/alias/{id}", response_model=MatchingAliasResponse)
def actualizar_alias(
    id: int,
    item: MatchingAliasUpdate,
    alias_repo: MatchingAliasRepository = Depends(get_matching_alias_repository)
):
    try:
        # Obtenemos el alias existente para mantener cuenta_id y fecha
        existente = alias_repo.obtener_por_id(id)
        if not existente:
            raise HTTPException(status_code=404, detail="Regla no encontrada")
            
        existente.patron = item.patron
        existente.reemplazo = item.reemplazo
        
        # Guardar (update)
        guardado = alias_repo.guardar(existente)
        return MatchingAliasResponse(
            id=guardado.id,
            cuenta_id=guardado.cuenta_id,
            patron=guardado.patron,
            reemplazo=guardado.reemplazo,
            created_at=guardado.created_at
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error actualizando alias: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/alias/{id}")
def eliminar_alias(
    id: int,
    alias_repo: MatchingAliasRepository = Depends(get_matching_alias_repository)
):
    try:
        alias_repo.eliminar(id)
        return {"mensaje": "Regla eliminada exitosamente"}
    except Exception as e:
        logger.error(f"Error eliminando alias: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
