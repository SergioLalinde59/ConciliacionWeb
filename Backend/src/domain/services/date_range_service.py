from datetime import date
from typing import Tuple, Optional
import calendar
from src.domain.ports.movimiento_extracto_repository import MovimientoExtractoRepository

class DateRangeService:
    def __init__(self, extracto_repo: MovimientoExtractoRepository):
        self.extracto_repo = extracto_repo

    def get_range_for_period(self, cuenta_id: int, year: int, month: int) -> Tuple[date, date]:
        """
        Calculates the date range for system movements based on the extract movements of the period.
        
        Rule:
        - If extract movements exist: Range is from min_date to max_date of extract movements.
        - If no extract movements: Range is the full calendar month.
        """
        
        # 1. Get extract movements
        movs_extracto = self.extracto_repo.obtener_por_periodo(cuenta_id, year, month)
        
        # Default: Calendar Month
        ultimo_dia = calendar.monthrange(year, month)[1]
        default_start = date(year, month, 1)
        default_end = date(year, month, ultimo_dia)

        if not movs_extracto:
            return default_start, default_end
            
        # 2. Calculate Min/Max from Extract
        fechas = [m.fecha for m in movs_extracto]
        min_date = min(fechas)
        max_date = max(fechas)
        
        # 3. Apply logic:
        # The user requested: "rangos de movimientos se define por la fecha menor y la fecha mayor de los movimientos del extracto"
        # We should check if this covers cases where extract dates are strictly WITHIN the month, 
        # but system movements exist outside that range but within the month?
        # A strict interpretation implies: If extract is Jan 2 - Jan 28, we ONLY check system Jan 2 - Jan 28.
        # System movements on Jan 1 or Jan 29 would be ignored.
        # This seems to be the desired behavior to align "extracto range" with "sistema range".
        
        return min_date, max_date
