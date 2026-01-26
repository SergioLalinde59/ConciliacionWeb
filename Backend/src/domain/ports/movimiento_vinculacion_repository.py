from abc import ABC, abstractmethod
from typing import List, Optional
from src.domain.models.movimiento_match import MovimientoMatch, MatchEstado


class MovimientoVinculacionRepository(ABC):
    """
    Puerto (Interface) para el repositorio de vinculaciones de movimientos.
    
    Arquitectura Hexagonal: Define el contrato que debe cumplir cualquier
    implementación concreta (ej: PostgreSQL, MongoDB, etc.)
    
    Esta interface pertenece a la capa de Dominio y NO conoce detalles
    de infraestructura (SQL, ORM, etc.)
    """
    
    @abstractmethod
    def guardar(self, vinculacion: MovimientoMatch) -> MovimientoMatch:
        """
        Guarda o actualiza una vinculación entre extracto y sistema.
        
        Args:
            vinculacion: MovimientoMatch a guardar
        
        Returns:
            MovimientoMatch guardado con ID asignado
        
        Raises:
            ValueError: Si la vinculación es inválida
        """
        pass
    
    @abstractmethod
    def obtener_por_periodo(
        self, 
        cuenta_id: int, 
        year: int, 
        month: int
    ) -> List[MovimientoMatch]:
        """
        Obtiene todas las vinculaciones de un periodo específico.
        
        Args:
            cuenta_id: ID de la cuenta
            year: Año del periodo
            month: Mes del periodo
        
        Returns:
            Lista de MovimientoMatch del periodo
        """
        pass
    
    @abstractmethod
    def obtener_por_extracto_id(
        self, 
        movimiento_extracto_id: int
    ) -> Optional[MovimientoMatch]:
        """
        Busca una vinculación por ID del movimiento del extracto.
        
        Args:
            movimiento_extracto_id: ID del movimiento del extracto
        
        Returns:
            MovimientoMatch si existe, None si no
        """
        pass
    
    @abstractmethod
    def desvincular(self, movimiento_extracto_id: int) -> None:
        """
        Elimina una vinculación existente.
        
        Args:
            movimiento_extracto_id: ID del movimiento del extracto a desvincular
        
        Raises:
            ValueError: Si no existe vinculación para ese ID
        """
        pass
    
    @abstractmethod
    def actualizar_estado(
        self, 
        vinculacion_id: int, 
        nuevo_estado: MatchEstado,
        usuario: str,
        notas: Optional[str] = None
    ) -> MovimientoMatch:
        """
        Actualiza el estado de una vinculación existente.
        
        Args:
            vinculacion_id: ID de la vinculación
            nuevo_estado: Nuevo estado a asignar
            usuario: Usuario que realiza el cambio
            notas: Notas opcionales sobre el cambio
        
        Returns:
            MovimientoMatch actualizado
        
        Raises:
            ValueError: Si no existe la vinculación
        """
        pass
    
    @abstractmethod
    def obtener_sin_confirmar(
        self, 
        cuenta_id: int, 
        year: int, 
        month: int
    ) -> List[MovimientoMatch]:
        """
        Obtiene vinculaciones que requieren confirmación del usuario.
        
        Args:
            cuenta_id: ID de la cuenta
            year: Año del periodo
            month: Mes del periodo
        
        Returns:
            Lista de MovimientoMatch con confirmado_por_usuario = False
        """
        pass
    
    @abstractmethod
    def obtener_por_estado(
        self, 
        cuenta_id: int, 
        year: int, 
        month: int,
        estado: MatchEstado
    ) -> List[MovimientoMatch]:
        """
        Obtiene vinculaciones filtradas por estado.
        
        Args:
            cuenta_id: ID de la cuenta
            year: Año del periodo
            month: Mes del periodo
            estado: Estado a filtrar
        
        Returns:
            Lista de MovimientoMatch con el estado especificado
        """
        pass
    
    @abstractmethod
    def eliminar(self, id: int) -> None:
        """
        Elimina físicamente un registro de vinculación.
        
        Args:
            id: ID de la vinculación a eliminar
        """
        pass
    
    @abstractmethod
    def obtener_por_sistema_id(self, sistema_id: int) -> Optional[MovimientoMatch]:
        """
        Busca una vinculación por ID del movimiento del sistema.
        
        Args:
            sistema_id: ID del movimiento del sistema
        
        Returns:
            MovimientoMatch si existe, None si no
        """
        pass

    @abstractmethod
    def desvincular_por_periodo(self, cuenta_id: int, year: int, month: int) -> int:
        """
        Elimina todas las vinculaciones de un periodo específico para una cuenta.
        
        Args:
            cuenta_id: ID de la cuenta
            year: Año del periodo
            month: Mes del periodo
            
        Returns:
            Cantidad de vinculaciones eliminadas
        """
        pass

