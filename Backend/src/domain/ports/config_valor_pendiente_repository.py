from abc import ABC, abstractmethod
from typing import List, Optional
from src.domain.models.config_valor_pendiente import ConfigValorPendiente

class ConfigValorPendienteRepository(ABC):
    """Repository interface for managing pending classification value configurations."""
    
    @abstractmethod
    def guardar(self, config: ConfigValorPendiente) -> ConfigValorPendiente:
        """
        Guarda (crea o actualiza) una configuración de valor pendiente.
        
        Args:
            config: Configuración a guardar
            
        Returns:
            ConfigValorPendiente con el ID asignado
        """
        pass

    @abstractmethod
    def obtener_por_id(self, id: int) -> Optional[ConfigValorPendiente]:
        """
        Obtiene una configuración por su ID.
        
        Args:
            id: ID de la configuración
            
        Returns:
            ConfigValorPendiente si existe, None en caso contrario
        """
        pass

    @abstractmethod
    def obtener_todos(self) -> List[ConfigValorPendiente]:
        """
        Obtiene todas las configuraciones.
        
        Returns:
            Lista de todas las configuraciones
        """
        pass
    
    @abstractmethod
    def obtener_ids_por_tipo(self, tipo: str) -> List[int]:
        """
        Obtiene los IDs de valores pendientes para un tipo específico.
        
        Args:
            tipo: Tipo de campo ('tercero', 'grupo', 'concepto')
            
        Returns:
            Lista de IDs de valores que significan "pendiente" para ese tipo
        """
        pass
    
    @abstractmethod
    def eliminar(self, id: int) -> None:
        """
        Elimina una configuración.
        
        Args:
            id: ID de la configuración a eliminar
        """
        pass
