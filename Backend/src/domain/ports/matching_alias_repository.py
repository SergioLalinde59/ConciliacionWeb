from abc import ABC, abstractmethod
from typing import List, Optional
from src.domain.models.matching_alias import MatchingAlias

class MatchingAliasRepository(ABC):
    """
    Puerto (Interface) para el repositorio de Alias de Matching via CRUD.
    """
    
    @abstractmethod
    def guardar(self, alias: MatchingAlias) -> MatchingAlias:
        """
        Guarda o actualiza un alias.
        """
        pass
    
    @abstractmethod
    def obtener_por_id(self, id: int) -> Optional[MatchingAlias]:
        """
        Obtiene un alias por su ID.
        """
        pass
        
    @abstractmethod
    def obtener_por_cuenta(self, cuenta_id: int) -> List[MatchingAlias]:
        """
        Obtiene todos los alias configurados para una cuenta específica.
        """
        pass
    
    @abstractmethod
    def eliminar(self, id: int) -> None:
        """
        Elimina un alias por su ID.
        """
        pass
