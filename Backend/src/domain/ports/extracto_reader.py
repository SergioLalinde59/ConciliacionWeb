from abc import ABC, abstractmethod
from typing import List
from src.domain.models.movimiento import Movimiento

class ExtractoReader(ABC):
    """
    Puerto (Interfaz) para leer extractos bancarios.
    Cada banco o fuente tendrá su propia implementación.
    """
    
    @abstractmethod
    def leer_archivo(self, ruta_archivo: str) -> List[Movimiento]:
        """
        Lee un archivo (PDF, Excel, etc.) y devuelve una lista de Movimientos del dominio.
        NO guarda en base de datos. Solo interpreta el archivo.
        """
        pass
    
    @abstractmethod
    def puede_procesar(self, ruta_archivo: str) -> bool:
        """Determina si este lector es capaz de procesar el archivo dado"""
        pass
