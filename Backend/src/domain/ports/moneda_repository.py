from abc import ABC, abstractmethod
from typing import List, Optional
from src.domain.models.moneda import Moneda

class MonedaRepository(ABC):
    @abstractmethod
    def guardar(self, moneda: Moneda) -> Moneda:
        pass

    @abstractmethod
    def obtener_por_id(self, monedaid: int) -> Optional[Moneda]:
        pass

    @abstractmethod
    def obtener_todos(self) -> List[Moneda]:
        pass
    
    @abstractmethod
    def buscar_por_nombre(self, nombre: str) -> Optional[Moneda]:
        pass
