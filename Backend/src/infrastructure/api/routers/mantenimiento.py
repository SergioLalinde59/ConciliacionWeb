from datetime import date
from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from src.infrastructure.database.connection import get_db_connection
from src.infrastructure.database.postgres_movimiento_repository import PostgresMovimientoRepository
from src.infrastructure.database.postgres_conciliacion_repository import PostgresConciliacionRepository
from src.application.services.mantenimiento_service import MantenimientoService

router = APIRouter(prefix="/api/mantenimiento", tags=["mantenimiento"])

def get_mantenimiento_service(conn=Depends(get_db_connection)) -> MantenimientoService:
    mov_repo = PostgresMovimientoRepository(conn)
    conciliacion_repo = PostgresConciliacionRepository(conn)
    return MantenimientoService(mov_repo, conciliacion_repo, conn)

@router.get("/analizar-desvinculacion")
def analizar_desvinculacion(
    fecha: date = Query(..., description="Fecha de corte (inicio) para analizar"),
    fecha_fin: Optional[date] = Query(None, description="Fecha de fin opcional (por defecto fin de mes)"),
    cuenta_id: Optional[int] = Query(None, description="ID de cuenta opcional para filtrar"),
    service: MantenimientoService = Depends(get_mantenimiento_service)
):
    """
    Analiza los movimientos que serían desvinculados en el rango indicado.
    Retorna estadísticas y estado de bloqueo por cuenta.
    """
    try:
        return service.analizar_desvinculacion(fecha, fecha_fin, cuenta_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/desvincular-movimientos")
def desvincular_movimientos(
    fecha: date = Query(..., description="Fecha de corte (inicio) para desvincular"),
    fecha_fin: Optional[date] = Query(None, description="Fecha de fin opcional (por defecto fin de mes)"),
    backup: bool = Query(True, description="Realizar backup antes de desvincular"),
    cuenta_id: Optional[int] = Query(None, description="ID de cuenta opcional para filtrar"),
    service: MantenimientoService = Depends(get_mantenimiento_service)
):
    """
    Desvincula (resetea) movimientos en el rango indicado.
    Elimina detalles y conciliaciones, dejándolos pendientes.
    Requiere que el periodo no esté conciliado.
    """
    try:
        count = service.desvincular_movimientos(fecha, fecha_fin, backup, cuenta_id)
        return {
            "mensaje": f"Se desvincularon {count} movimientos correctamente. Ahora están pendientes de clasificación.",
            "registros_desvinculados": count
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
@router.post("/desvincular-lote")
def desvincular_lote(
    ids: List[int] = Query(..., description="IDs de movimientos a desvincular"),
    backup: bool = Query(True, description="Realizar backup antes de desvincular"),
    service: MantenimientoService = Depends(get_mantenimiento_service)
):
    """
    Desvincula (resetea) una lista específica de movimientos por ID.
    Al igual que la acción por rango, reinicia detalles y vinculaciones.
    """
    try:
        count = service.desvincular_por_ids(ids, backup)
        return {
            "mensaje": f"Se desvincularon {count} movimientos correctamente.",
            "registros_desvinculados": count
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
