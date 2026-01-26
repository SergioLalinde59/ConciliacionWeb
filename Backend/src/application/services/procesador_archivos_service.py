from typing import Dict, Any, Optional, List
from src.domain.ports.movimiento_repository import MovimientoRepository
from src.domain.ports.moneda_repository import MonedaRepository
from src.domain.ports.tercero_repository import TerceroRepository
from src.domain.ports.conciliacion_repository import ConciliacionRepository
from src.domain.ports.movimiento_extracto_repository import MovimientoExtractoRepository
from src.domain.ports.cuenta_extractor_repository import CuentaExtractorRepository
from src.application.services.cargar_movimientos_service import CargarMovimientosService
from src.application.services.cargar_extracto_bancario_service import CargarExtractoBancarioService

class ProcesadorArchivosService:
    """
    [DEPRECATED / FACADE]
    Este servicio ahora actúa como fachada para mantener compatibilidad,
    delegando tareas a CargarMovimientosService y CargarExtractoBancarioService.
    """
    def __init__(self, 
                 movimiento_repo: MovimientoRepository, 
                 moneda_repo: MonedaRepository,
                 tercero_repo: TerceroRepository, # Se mantiene por firma, aunque no se use directo
                 conciliacion_repo: Optional[ConciliacionRepository] = None,
                 movimiento_extracto_repo: Optional[MovimientoExtractoRepository] = None,
                 cuenta_extractor_repo: Optional[CuentaExtractorRepository] = None):
        
        # Instanciar los nuevos servicios delegados
        self.cargar_movimientos_service = CargarMovimientosService(
            movimiento_repo=movimiento_repo,
            moneda_repo=moneda_repo,
            cuenta_extractor_repo=cuenta_extractor_repo
        )
        
        self.cargar_extracto_service = CargarExtractoBancarioService(
            conciliacion_repo=conciliacion_repo,
            movimiento_extracto_repo=movimiento_extracto_repo,
            cuenta_extractor_repo=cuenta_extractor_repo
        )

    # --- Delegación a CargarMovimientosService ---
    def analizar_archivo(self, file_obj: Any, filename: str, tipo_cuenta: str, cuenta_id: Optional[int] = None) -> Dict[str, Any]:
        return self.cargar_movimientos_service.analizar_archivo(file_obj, filename, tipo_cuenta, cuenta_id)

    def procesar_archivo(self, file_obj: Any, filename: str, tipo_cuenta: str, cuenta_id: int, actualizar_descripciones: bool = False) -> Dict[str, Any]:
        return self.cargar_movimientos_service.procesar_archivo(file_obj, filename, tipo_cuenta, cuenta_id, actualizar_descripciones)

    # --- Delegación a CargarExtractoBancarioService ---
    def analizar_extracto(self, file_obj: Any, filename: str, tipo_cuenta: str, cuenta_id: Optional[int] = None) -> Dict[str, Any]:
        return self.cargar_extracto_service.analizar_extracto(file_obj, filename, tipo_cuenta, cuenta_id)

    async def procesar_extracto(self, file_obj: Any, filename: str, tipo_cuenta: str, cuenta_id: int, year: Optional[int] = None, month: Optional[int] = None, overrides: Optional[Dict[str, Any]] = None, movimientos_confirmados: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        return await self.cargar_extracto_service.procesar_extracto(file_obj, filename, tipo_cuenta, cuenta_id, year, month, overrides, movimientos_confirmados)
