from abc import ABC, abstractmethod
from typing import List, Optional
from src.domain.models.conciliacion import Conciliacion

class ConciliacionRepository(ABC):
    """Puerto para el repositorio de conciliaciones"""

    @abstractmethod
    def obtener_por_periodo(self, cuenta_id: int, year: int, month: int) -> Optional[Conciliacion]:
        """Obtiene una conciliación específica or None"""
        pass

    @abstractmethod
    def guardar(self, conciliacion: Conciliacion) -> Conciliacion:
        """Crea o actualiza una conciliación"""
        pass
        
    @abstractmethod
    def recalcular_sistema(self, cuenta_id: int, year: int, month: int) -> Conciliacion:
        """
        Calcula los valores del sistema sumando movimientos y actualiza la conciliación.
        Debe recalcular: sistema_entradas, sistema_salidas, sistema_saldo_final
        """
        pass
