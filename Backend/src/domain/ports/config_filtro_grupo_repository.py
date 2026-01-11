from abc import ABC, abstractmethod
from typing import List, Optional
from src.domain.models.config_filtro_grupo import ConfigFiltroGrupo

class ConfigFiltroGrupoRepository(ABC):
    """Repository interface for managing filter exclusion configurations."""
    
    @abstractmethod
    def guardar(self, config: ConfigFiltroGrupo) -> ConfigFiltroGrupo:
        """
        Guarda (crea o actualiza) una configuración de filtro.
        
        Args:
            config: Configuración a guardar
            
        Returns:
            ConfigFiltroGrupo con el ID asignado
        """
        pass

    @abstractmethod
    def obtener_por_id(self, id: int) -> Optional[ConfigFiltroGrupo]:
        """
        Obtiene una configuración por su ID.
        
        Args:
            id: ID de la configuración
            
        Returns:
            ConfigFiltroGrupo si existe, None en caso contrario
        """
        pass

    @abstractmethod
    def obtener_todos(self) -> List[ConfigFiltroGrupo]:
        """
        Obtiene todas las configuraciones de filtros.
        
        Returns:
            Lista de todas las configuraciones
        """
        pass
    
    @abstractmethod
    def eliminar(self, id: int) -> None:
        """
        Elimina una configuración de filtro.
        
        Args:
            id: ID de la configuración a eliminar
        """
        pass
