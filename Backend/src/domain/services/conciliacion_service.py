from typing import List
from src.domain.models.movimiento import Movimiento
from src.domain.ports.movimiento_repository import MovimientoRepository
from src.domain.ports.movimiento_vinculacion_repository import MovimientoVinculacionRepository
from src.domain.services.date_range_service import DateRangeService
from src.domain.ports.conciliacion_repository import ConciliacionRepository

class ConciliacionService:
    def __init__(
        self, 
        movimiento_repo: MovimientoRepository,
        vinculacion_repo: MovimientoVinculacionRepository,
        conciliacion_repo: ConciliacionRepository,
        date_service: DateRangeService
    ):
        self.movimiento_repo = movimiento_repo
        self.vinculacion_repo = vinculacion_repo
        self.conciliacion_repo = conciliacion_repo
        self.date_service = date_service

    def obtener_universo_sistema(self, cuenta_id: int, year: int, month: int) -> List[Movimiento]:
        """
        Obtiene todos los movimientos del sistema relevantes para la conciliación del periodo.
        
        Regla de Negocio:
        El universo de movimientos del sistema se compone de:
        1. TODOS los movimientos cuya fecha caiga en el mes calendario (1 al 31).
        2. CUALQUIER movimiento de otro periodo que esté vinculado (Match) a un movimiento del extracto de este mes.
           (Esto cubre los 'Traslados' o cheques cobrados en fecha distinta).
        
        Esto garantiza que la vista de 'Sistema' y 'Matching' sean consistentes.
        """
        
        # 1. Obtener rango del mes calendario (1 al 31)
        # La lógica de "Min/Max Extracto" ya fue eliminada de date_range_service
        fecha_inicio, fecha_fin = self.date_service.get_range_for_period(cuenta_id, year, month)
        
        # 2. Obtener movimientos base (del calendario)
        movs_calendario, _ = self.movimiento_repo.buscar_avanzado(
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            cuenta_id=cuenta_id
        )
        
        # 3. Obtener movimientos de OTROS periodos que estén vinculados a este mes
        matches = self.vinculacion_repo.obtener_por_periodo(cuenta_id, year, month)
        
        # Recolectar IDs de sistema vinculados
        linked_system_ids = set()
        for match in matches:
            if match.mov_sistema:
                linked_system_ids.add(match.mov_sistema.id)
                
        # 4. Combinar conjuntos evitando duplicados
        # Usamos un dict por ID para acceso rápido
        universo = {m.id: m for m in movs_calendario}
        
        # Identificar cuáles faltan
        ids_faltantes = [mid for mid in linked_system_ids if mid not in universo]
        
        if ids_faltantes:
            # Traer los que faltan (Traslados, cheques antiguos, etc)
            movs_extra = self.movimiento_repo.obtener_por_ids(ids_faltantes)
            for m in movs_extra:
                universo[m.id] = m
        
        # Retornar lista plana
        return list(universo.values())

    def resetear_periodo(self, cuenta_id: int, year: int, month: int) -> int:
        """
        Elimina todas las vinculaciones del periodo y recalcula el resumen del sistema.
        
        IMPORTANTE: Mantiene intactos los datos del extracto y los movimientos del sistema,
        solo elimina las relaciones (vinculaciones) y actualiza los saldos en la tabla conciliaciones.
        """
        # 1. Eliminar vinculaciones
        eliminados = self.vinculacion_repo.desvincular_por_periodo(cuenta_id, year, month)
        
        # 2. Recalcular saldos del sistema en conciliación (volverán a ser saldos totales en libros)
        # Se requieren fechas para el recálculo
        fecha_inicio, fecha_fin = self.date_service.get_range_for_period(cuenta_id, year, month)
        self.conciliacion_repo.recalcular_sistema(cuenta_id, year, month, fecha_inicio, fecha_fin)
        
        return eliminados
