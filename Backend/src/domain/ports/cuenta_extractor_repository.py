from abc import ABC, abstractmethod
from typing import List

class CuentaExtractorRepository(ABC):
    """
    Repositorio para obtener la configuración de extractores de una cuenta.
    """
    
    @abstractmethod
    def obtener_modulos(self, cuenta_id: int, tipo: str) -> List[str]:
        """
        Retorna la lista de nombres de módulos extractores configurados para una cuenta y tipo.
        Deben retornarse en orden de prioridad (campo 'orden').
        
        Args:
            cuenta_id: ID de la cuenta
            tipo: 'MOVIMIENTOS' o 'RESUMEN'
            
        Returns:
            Lista de strings (nombres de módulos)
        """
    @abstractmethod
    def obtener_todos(self) -> List:
        pass

    @abstractmethod
    def guardar(self, extractor) -> object:
        pass

    @abstractmethod
    def actualizar(self, extractor) -> object:
        pass

    @abstractmethod
    def eliminar(self, id: int) -> None:
        pass

