from abc import ABC, abstractmethod
from typing import List, Optional
from src.domain.models.tercero_descripcion import TerceroDescripcion

class TerceroDescripcionRepository(ABC):
    """Puerto para el repositorio de descripciones de terceros."""
    
    @abstractmethod
    def guardar(self, descripcion: TerceroDescripcion) -> TerceroDescripcion:
        """Guarda (crea o actualiza) una descripción."""
        pass
    
    @abstractmethod
    def obtener_por_id(self, id: int) -> Optional[TerceroDescripcion]:
        """Obtiene una descripción por su ID."""
        pass
    
    @abstractmethod
    def obtener_por_tercero_id(self, terceroid: int) -> List[TerceroDescripcion]:
        """Obtiene todas las descripciones asociadas a un tercero maestro."""
        pass

    @abstractmethod
    def obtener_todas(self) -> List[TerceroDescripcion]:
        """Obtiene todas las descripciones del sistema."""
        pass
    
    @abstractmethod
    def eliminar(self, id: int) -> None:
        """Elimina (soft delete) una descripción."""
        pass
    
    @abstractmethod
    def buscar_por_referencia(self, referencia: str) -> Optional['TerceroDescripcion']:
        """Busca una descripción por referencia exacta."""
        pass
    
    @abstractmethod
    def buscar_por_descripcion(self, texto: str) -> List['TerceroDescripcion']:
        """Busca descripciones que contengan el texto dado."""
        pass
