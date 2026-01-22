from abc import ABC, abstractmethod
from typing import Optional
from src.domain.models.configuracion_matching import ConfiguracionMatching


class ConfiguracionMatchingRepository(ABC):
    """
    Puerto (Interface) para el repositorio de configuración de matching.
    
    Arquitectura Hexagonal: Define el contrato que debe cumplir cualquier
    implementación concreta (ej: PostgreSQL, archivo JSON, etc.)
    
    Esta interface pertenece a la capa de Dominio y NO conoce detalles
    de infraestructura (SQL, ORM, etc.)
    """
    
    @abstractmethod
    def obtener_activa(self) -> ConfiguracionMatching:
        """
        Obtiene la configuración activa del sistema.
        
        Returns:
            ConfiguracionMatching activa
        
        Raises:
            ValueError: Si no existe configuración activa
        """
        pass
    
    @abstractmethod
    def obtener_por_id(self, config_id: int) -> Optional[ConfiguracionMatching]:
        """
        Obtiene una configuración específica por ID.
        
        Args:
            config_id: ID de la configuración
        
        Returns:
            ConfiguracionMatching si existe, None si no
        """
        pass
    
    @abstractmethod
    def crear(self, config: ConfiguracionMatching) -> ConfiguracionMatching:
        """
        Crea una nueva configuración.
        
        Args:
            config: ConfiguracionMatching a crear
        
        Returns:
            ConfiguracionMatching creada con ID asignado
        
        Raises:
            ValueError: Si la configuración es inválida
        """
        pass
    
    @abstractmethod
    def actualizar(self, config: ConfiguracionMatching) -> ConfiguracionMatching:
        """
        Actualiza la configuración existente.
        
        Args:
            config: ConfiguracionMatching con datos actualizados
        
        Returns:
            ConfiguracionMatching actualizada
        
        Raises:
            ValueError: Si no existe la configuración o es inválida
        """
        pass
    
    @abstractmethod
    def activar(self, config_id: int) -> ConfiguracionMatching:
        """
        Activa una configuración específica y desactiva las demás.
        
        Args:
            config_id: ID de la configuración a activar
        
        Returns:
            ConfiguracionMatching activada
        
        Raises:
            ValueError: Si no existe la configuración
        """
        pass
