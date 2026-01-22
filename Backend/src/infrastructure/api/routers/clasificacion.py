from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from src.infrastructure.api.dependencies import (
    get_movimiento_repository, 
    get_reglas_repository, 
    get_tercero_repository, 
    get_tercero_descripcion_repository,
    get_centro_costo_repository,
    get_concepto_repository
)
from src.domain.ports.movimiento_repository import MovimientoRepository
from src.domain.ports.reglas_repository import ReglasRepository
from src.domain.ports.tercero_repository import TerceroRepository
from src.domain.ports.tercero_descripcion_repository import TerceroDescripcionRepository
from src.domain.ports.centro_costo_repository import CentroCostoRepository
from src.domain.ports.concepto_repository import ConceptoRepository
from src.application.services.clasificacion_service import ClasificacionService
from src.infrastructure.api.routers.movimientos import MovimientoResponse, _to_response # Reuse existing DTOs

router = APIRouter(prefix="/api/clasificacion", tags=["clasificacion"])

class SugerenciaSchema(BaseModel):
    tercero_id: Optional[int]
    centro_costo_id: Optional[int]
    concepto_id: Optional[int]
    razon: Optional[str]
    tipo_match: Optional[str]

class ContextoClasificacionResponse(BaseModel):
    movimiento_id: int
    sugerencia: SugerenciaSchema
    contexto: List[MovimientoResponse]
    referencia_no_existe: bool = False
    referencia: Optional[str] = None

class ClasificacionLoteDTO(BaseModel):
    patron: Optional[str] = None
    movimiento_ids: Optional[List[int]] = None  # NUEVO: para clasificar por IDs
    tercero_id: int
    centro_costo_id: int
    concepto_id: int

class PreviewSimilaresResponse(BaseModel):
    total: int
    movimientos: List[Dict[str, Any]]  # Incluye movimiento + similitud

def get_clasificacion_service(
    mov_repo: MovimientoRepository = Depends(get_movimiento_repository),
    reglas_repo: ReglasRepository = Depends(get_reglas_repository),
    tercero_repo: TerceroRepository = Depends(get_tercero_repository),
    tercero_desc_repo: TerceroDescripcionRepository = Depends(get_tercero_descripcion_repository),
    grupo_repo: CentroCostoRepository = Depends(get_centro_costo_repository),
    concepto_repo: ConceptoRepository = Depends(get_concepto_repository)
) -> ClasificacionService:
    return ClasificacionService(
        mov_repo, 
        reglas_repo, 
        tercero_repo, 
        tercero_desc_repo, 
        concepto_repo, 
        grupo_repo
    )

@router.get("/sugerencia/{id}", response_model=ContextoClasificacionResponse)
def obtener_sugerencia(
    id: int, 
    service: ClasificacionService = Depends(get_clasificacion_service)
):
    """
    Obtiene una sugerencia de clasificación para un movimiento y su contexto histórico.
    No guarda cambios.
    """
    try:
        resultado = service.obtener_sugerencia_clasificacion(id)
        
        # Convertir objetos de dominio a DTOs de respuesta
        contexto_dto = [_to_response(m) for m in resultado['contexto']]
        
        return ContextoClasificacionResponse(
            movimiento_id=resultado['movimiento_id'],
            sugerencia=SugerenciaSchema(**resultado['sugerencia']),
            contexto=contexto_dto,
            referencia_no_existe=resultado.get('referencia_no_existe', False),
            referencia=resultado.get('referencia')
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auto-clasificar")
def auto_clasificar_todos(service: ClasificacionService = Depends(get_clasificacion_service)):
    """
    Ejecuta el job de clasificación automática sobre todos los pendientes.
    Guarda los cambios inmediatamente.
    """
    try:
        return service.auto_clasificar_pendientes()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clasificar-lote")
def clasificar_lote(
    dto: ClasificacionLoteDTO,
    service: ClasificacionService = Depends(get_clasificacion_service),
    mov_repo: MovimientoRepository = Depends(get_movimiento_repository)
):
    """
    Clasifica masivamente movimientos pendientes.
    Acepta un patrón de descripción O una lista de IDs de movimientos.
    """
    try:
        if dto.movimiento_ids:
            # Clasificar por lista de IDs
            afectados = 0
            for mov_id in dto.movimiento_ids:
                movimiento = mov_repo.obtener_por_id(mov_id)
                if movimiento and not movimiento.tercero_id:  # Solo si está pendiente
                    movimiento.tercero_id = dto.tercero_id
                    movimiento.centro_costo_id = dto.centro_costo_id
                    movimiento.concepto_id = dto.concepto_id
                    mov_repo.guardar(movimiento)
                    afectados += 1
            return {"filas_afectadas": afectados, "mensaje": f"{afectados} movimientos actualizados correctamente"}
        elif dto.patron:
            # Clasificar por patrón (comportamiento original)
            afectados = service.aplicar_regla_lote(
                dto.patron, dto.tercero_id, dto.centro_costo_id, dto.concepto_id
            )
            return {"filas_afectadas": afectados, "mensaje": f"{afectados} movimientos actualizados correctamente"}
        else:
            raise HTTPException(status_code=400, detail="Debe proporcionar 'patron' o 'movimiento_ids'")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/preview-similares/{movimiento_id}")
def preview_similares(
    movimiento_id: int,
    service: ClasificacionService = Depends(get_clasificacion_service)
):
    """
    Obtiene una vista previa de todos los movimientos pendientes similares a un movimiento dado.
    Retorna la lista con porcentajes de similitud para que el usuario revise antes de clasificar.
    """
    try:
        candidatos = service.obtener_movimientos_similares_pendientes(movimiento_id)
        
        # Convertir a DTOs
        movimientos_dto = []
        for item in candidatos:
            mov = item['movimiento']
            mov_response = _to_response(mov)
            movimientos_dto.append({
                **mov_response.dict(),
                'similitud': item['similitud']
            })
        
        return {
            "total": len(movimientos_dto),
            "movimientos": movimientos_dto
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PreviewLoteRequest(BaseModel):
    patron: str

@router.post("/preview-lote", response_model=List[MovimientoResponse])
def preview_clasificacion_lote(
    dto: PreviewLoteRequest,
    mov_repo: MovimientoRepository = Depends(get_movimiento_repository)
):
    """
    Retorna lista de movimientos pendientes que coinciden con el patrón.
    NO modifica nada, solo para preview antes de aplicar en lote.
    """
    try:
        # Buscar pendientes que coinciden con el patrón (ILIKE)
        from src.infrastructure.database.postgres_movimiento_repository import PostgresMovimientoRepository
        
        if isinstance(mov_repo, PostgresMovimientoRepository):
            cursor = mov_repo.conn.cursor()
            query = """
                SELECT m.Id, m.Fecha, m.Descripcion, m.Referencia, m.Valor, m.USD, m.TRM, 
                       m.MonedaID, m.CuentaID, m.TerceroID, m.centro_costo_id, m.ConceptoID, m.created_at, m.Detalle,
                       c.cuenta AS cuenta_nombre,
                       mon.moneda AS moneda_nombre,
                       t.tercero AS tercero_nombre,
                       cc.centro_costo AS centro_costo_nombre,
                       con.concepto AS concepto_nombre
                FROM movimientos m
                LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
                LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
                LEFT JOIN terceros t ON m.TerceroID = t.terceroid
                LEFT JOIN centro_costos cc ON m.centro_costo_id = cc.centro_costo_id
                LEFT JOIN conceptos con ON m.ConceptoID = con.conceptoid
                WHERE UPPER(m.Descripcion) LIKE UPPER(%s)
                  AND (m.TerceroID IS NULL OR m.centro_costo_id IS NULL OR m.ConceptoID IS NULL)
                ORDER BY m.Fecha DESC
                LIMIT 50
            """
            patron = f"%{dto.patron}%"
            cursor.execute(query, (patron,))
            rows = cursor.fetchall()
            cursor.close()
            
            movimientos = [mov_repo._row_to_movimiento(row) for row in rows]
            return [_to_response(m) for m in movimientos]
        
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
