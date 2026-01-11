from abc import ABC, abstractmethod
from typing import List, Optional
from src.domain.models.tercero import Tercero

class TerceroRepository(ABC):
    """
    Puerto (Interface) para el repositorio de Terceros.
    Define las operaciones que la aplicación puede solicitar,
    sin importar si los datos vienen de PostgreSQL, un CSV o una API.
    
    Nota: Después de 3NF, descripcion/referencia están en tercero_descripciones.
    """

    @abstractmethod
    def guardar(self, tercero: Tercero) -> Tercero:
        """Guarda un tercero y devuelve la instancia actualizada (con ID)"""
        pass

    @abstractmethod
    def obtener_por_id(self, terceroid: int) -> Optional[Tercero]:
        """Busca un tercero por su ID"""
        pass

    @abstractmethod
    def obtener_todos(self) -> List[Tercero]:
        """Devuelve todos los terceros"""
        pass

    @abstractmethod
    def buscar_similares(self, query: str, limite: int = 20) -> List[Tercero]:
        """Busca terceros usando similitud de trigramas (Fuzzy Search)"""
        pass

    @abstractmethod
    def buscar_exacto(self, nombre: str) -> Optional[Tercero]:
        """Busca un tercero que coincida exactamente con el nombre"""
        pass

    @abstractmethod
    def eliminar(self, terceroid: int):
        """Elimina (soft-delete) un tercero por su ID"""
        pass
