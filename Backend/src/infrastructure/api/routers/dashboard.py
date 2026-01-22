from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import date
from pydantic import BaseModel

from src.domain.ports.movimiento_repository import MovimientoRepository
from src.infrastructure.api.dependencies import get_movimiento_repository
from src.infrastructure.logging.config import logger

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

class DashboardStats(BaseModel):
    periodo: str
    cuenta_id: Optional[int]
    cuenta_nombre: str
    centro_costo_id: Optional[int]
    centro_costo_nombre: str
    conteo: int
    ingresos: float
    egresos: float

@router.get("/estadisticas", response_model=List[DashboardStats])
def obtener_estadisticas(
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    repo: MovimientoRepository = Depends(get_movimiento_repository)
):
    """
    Obtiene estadísticas para el dashboard.
    Agrupadas por yyyy-mmm, cuenta, centro_costo.
    """
    try:
        stats = repo.obtener_estadisticas_dashboard(
            fecha_inicio=desde,
            fecha_fin=hasta
        )
        return stats
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas del dashboard: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno al obtener estadísticas")
