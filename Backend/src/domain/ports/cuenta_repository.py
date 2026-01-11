from abc import ABC, abstractmethod
from typing import List, Optional
from src.domain.models.cuenta import Cuenta

class CuentaRepository(ABC):
    @abstractmethod
    def guardar(self, cuenta: Cuenta) -> Cuenta:
        pass

    @abstractmethod
    def obtener_por_id(self, cuentaid: int) -> Optional[Cuenta]:
        pass

    @abstractmethod
    def obtener_todos(self) -> List[Cuenta]:
        pass

    @abstractmethod
    def buscar_por_nombre(self, nombre: str) -> Optional[Cuenta]:
        pass
