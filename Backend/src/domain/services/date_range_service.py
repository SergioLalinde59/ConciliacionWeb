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
        
        # Simply return the full calendar month range
        ultimo_dia = calendar.monthrange(year, month)[1]
        start_date = date(year, month, 1)
        end_date = date(year, month, ultimo_dia)
        
        return start_date, end_date
