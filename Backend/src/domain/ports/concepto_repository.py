from abc import ABC, abstractmethod
from typing import List, Optional
from src.domain.models.concepto import Concepto

class ConceptoRepository(ABC):
    @abstractmethod
    def guardar(self, concepto: Concepto) -> Concepto:
        pass

    @abstractmethod
    def obtener_por_id(self, conceptoid: int) -> Optional[Concepto]:
        pass

    @abstractmethod
    def obtener_todos(self) -> List[Concepto]:
        pass
    
    @abstractmethod
    def buscar_por_centro_costo_id(self, centro_costo_id: int) -> List[Concepto]:
        pass

    @abstractmethod
    def buscar_por_nombre(self, nombre: str, centro_costo_id: Optional[int] = None) -> Optional[Concepto]:
        pass

    @abstractmethod
    def obtener_id_traslados(self, centro_costo_id: int) -> Optional[int]:
        """Obtiene el ID del concepto de 'Traslado' para un grupo dado"""
        pass
