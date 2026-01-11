from abc import ABC, abstractmethod
from typing import List
from src.domain.models.regla_clasificacion import ReglaClasificacion

class ReglasRepository(ABC):
    """Puerto para obtener las reglas de clasificación."""
    
    @abstractmethod
    def obtener_todos(self) -> List[ReglaClasificacion]:
        pass

    @abstractmethod
    def guardar(self, regla: ReglaClasificacion) -> ReglaClasificacion:
        pass

    @abstractmethod
    def eliminar(self, id: int) -> None:
        pass
