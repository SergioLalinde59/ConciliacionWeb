from abc import ABC, abstractmethod
from typing import List, Optional
from src.domain.models.movimiento_extracto import MovimientoExtracto
class MovimientoExtractoRepository(ABC):
    """
    Repository para Movimientos de Extractos Bancarios.
    """
    
    @abstractmethod
    def guardar(self, movimiento: MovimientoExtracto) -> MovimientoExtracto:
        """Guarda un movimiento de extracto"""
        pass
    
    @abstractmethod
    def guardar_lote(self, movimientos: List[MovimientoExtracto]) -> int:
        """
        Guarda múltiples movimientos de extracto en batch.
        Retorna: cantidad guardada
        """
        pass
    
    @abstractmethod
    def obtener_por_periodo(self, cuenta_id: int, year: int, month: int) -> List[MovimientoExtracto]:
        """Obtiene todos los movimientos del extracto para un periodo específico"""
        pass
    
    @abstractmethod
    def eliminar_por_periodo(self, cuenta_id: int, year: int, month: int) -> int:
        """
        Elimina movimientos de extracto de un periodo.
        Útil para reemplazar al cargar un nuevo extracto del mismo periodo.
        Retorna: cantidad eliminada
        """
        pass
    
    @abstractmethod
    def obtener_por_id(self, id: int) -> Optional[MovimientoExtracto]:
        """Obtiene un movimiento de extracto por ID"""
        pass
    
    @abstractmethod
    def contar_por_periodo(self, cuenta_id: int, year: int, month: int) -> int:
        """Cuenta movimientos de extracto para un periodo"""
        pass

    @abstractmethod
    def existe_movimiento(self, fecha, valor, referencia, cuenta_id: int, descripcion=None, usd=None) -> bool:
        """Verifica si existe un movimiento en el extracto"""
        pass