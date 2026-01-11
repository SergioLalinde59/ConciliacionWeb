from abc import ABC, abstractmethod
from typing import List, Optional
from src.domain.models.tipo_mov import TipoMov

class TipoMovRepository(ABC):
    @abstractmethod
    def guardar(self, tipo: TipoMov) -> TipoMov:
        pass

    @abstractmethod
    def obtener_por_id(self, tipomovid: int) -> Optional[TipoMov]:
        pass

    @abstractmethod
    def obtener_todos(self) -> List[TipoMov]:
        pass
    
    @abstractmethod
    def buscar_por_nombre(self, nombre: str) -> Optional[TipoMov]:
        pass
