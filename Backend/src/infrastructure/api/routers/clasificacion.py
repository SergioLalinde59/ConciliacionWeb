from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from src.infrastructure.api.dependencies import (
    get_movimiento_repository, 
    get_reglas_repository, 
    get_tercero_repository, 
    get_tercero_descripcion_repository,
    get_grupo_repository,
    get_concepto_repository
)
from src.domain.ports.movimiento_repository import MovimientoRepository
from src.domain.ports.reglas_repository import ReglasRepository
from src.domain.ports.tercero_repository import TerceroRepository
from src.domain.ports.tercero_descripcion_repository import TerceroDescripcionRepository
from src.domain.ports.grupo_repository import GrupoRepository
from src.domain.ports.concepto_repository import ConceptoRepository
from src.application.services.clasificacion_service import ClasificacionService
from src.infrastructure.api.routers.movimientos import MovimientoResponse, _to_response # Reuse existing DTOs

router = APIRouter(prefix="/api/clasificacion", tags=["clasificacion"])

class SugerenciaSchema(BaseModel):
    tercero_id: Optional[int]
    grupo_id: Optional[int]
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
    patron: str
    tercero_id: int
    grupo_id: int
    concepto_id: int

def get_clasificacion_service(
    mov_repo: MovimientoRepository = Depends(get_movimiento_repository),
    reglas_repo: ReglasRepository = Depends(get_reglas_repository),
    tercero_repo: TerceroRepository = Depends(get_tercero_repository),
    tercero_desc_repo: TerceroDescripcionRepository = Depends(get_tercero_descripcion_repository),
    grupo_repo: GrupoRepository = Depends(get_grupo_repository),
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
    service: ClasificacionService = Depends(get_clasificacion_service)
):
    """
    Clasifica masivamente movimientos pendientes que coinciden con un patrón.
    """
    try:
        afectados = service.aplicar_regla_lote(
            dto.patron, dto.tercero_id, dto.grupo_id, dto.concepto_id
        )
        return {"filas_afectadas": afectados, "mensaje": f"{afectados} movimientos actualizados correctamente"}
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
                       m.MonedaID, m.CuentaID, m.TerceroID, m.GrupoID, m.ConceptoID, m.created_at, m.Detalle,
                       c.cuenta AS cuenta_nombre,
                       mon.moneda AS moneda_nombre,
                       t.tercero AS tercero_nombre,
                       g.grupo AS grupo_nombre,
                       con.concepto AS concepto_nombre
                FROM movimientos m
                LEFT JOIN cuentas c ON m.CuentaID = c.cuentaid
                LEFT JOIN monedas mon ON m.MonedaID = mon.monedaid
                LEFT JOIN terceros t ON m.TerceroID = t.terceroid
                LEFT JOIN grupos g ON m.GrupoID = g.grupoid
                LEFT JOIN conceptos con ON m.ConceptoID = con.conceptoid
                WHERE UPPER(m.Descripcion) LIKE UPPER(%s)
                  AND (m.TerceroID IS NULL OR m.GrupoID IS NULL OR m.ConceptoID IS NULL)
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
