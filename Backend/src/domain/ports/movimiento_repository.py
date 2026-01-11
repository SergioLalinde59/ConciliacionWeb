from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import date
from src.domain.models.movimiento import Movimiento

class MovimientoRepository(ABC):
    """
    Puerto (Interface) para el repositorio de Movimientos.
    """

    @abstractmethod
    def guardar(self, movimiento: Movimiento) -> Movimiento:
        """Guarda o actualiza un movimiento"""
        pass

    @abstractmethod
    def obtener_por_id(self, id: int) -> Optional[Movimiento]:
        """Obtiene un movimiento por su ID único"""
        pass

    @abstractmethod
    def buscar_por_fecha(self, fecha_inicio: date, fecha_fin: date) -> List[Movimiento]:
        """Busca movimientos en un rango de fechas"""
        pass

    @abstractmethod
    def buscar_pendientes_clasificacion(
        self,
        terceros_pendientes: List[int] = None,
        grupos_pendientes: List[int] = None,
        conceptos_pendientes: List[int] = None
    ) -> List[Movimiento]:
        """
        Obtiene movimientos pendientes de clasificación.
        Incluye movimientos con campos NULL o con IDs que semánticamente significan "pendiente".
        """
        pass

    @abstractmethod
    def buscar_por_referencia(self, referencia: str) -> List[Movimiento]:
        """Busca movimientos por su referencia bancaria exacta"""
        pass
    
    @abstractmethod
    def existe_movimiento(self, fecha: date, valor: float, referencia: str, descripcion: str = None, usd: float = None) -> bool:
        """
        Verifica si existe un movimiento duplicado (misma fecha, valor, referencia - y descripción si no hay Ref).
        Útil para evitar cargas duplicadas de extractos.
        Si se pasa 'usd', se valida contra la columna USD en la BD.
        """
        pass

    @abstractmethod
    def obtener_todos(self) -> List[Movimiento]:
        """Obtiene todos los movimientos activos"""
        pass

    @abstractmethod
    def buscar_avanzado(self, 
                       fecha_inicio: Optional[date] = None, 
                       fecha_fin: Optional[date] = None,
                       cuenta_id: Optional[int] = None,
                       tercero_id: Optional[int] = None,
                       grupo_id: Optional[int] = None,
                       concepto_id: Optional[int] = None,
                       grupos_excluidos: Optional[List[int]] = None,
                       solo_pendientes: bool = False,
                       tipo_movimiento: Optional[str] = None,
                       skip: int = 0,
                       limit: Optional[int] = None
    ) -> tuple[List[Movimiento], int]:
        """
        Búsqueda con múltiples filtros opcionales y paginación.
        
        Returns:
            tuple: (lista de movimientos, total de registros)
        """
        pass

    @abstractmethod
    def resumir_por_clasificacion(self, 
                                 tipo_agrupacion: str,
                                 fecha_inicio: Optional[date] = None, 
                                 fecha_fin: Optional[date] = None,
                                 cuenta_id: Optional[int] = None,
                                 tercero_id: Optional[int] = None,
                                 grupo_id: Optional[int] = None,
                                 concepto_id: Optional[int] = None,
                                 grupos_excluidos: Optional[List[int]] = None,
                                 tipo_movimiento: Optional[str] = None
    ) -> List[dict]:
        """Agrupa y resume movimientos por tercero o grupo"""
        pass

    @abstractmethod
    def buscar_contexto_por_descripcion_similar(self, patron: str, limite: int = 5) -> List[Movimiento]:
        """
        Busca movimientos recientes con descripción similar (ILIKE).
        Útil para sugerir clasificaciones basadas en historial.
        """
        pass

    @abstractmethod
    def actualizar_clasificacion_lote(self, patron: str, tercero_id: int, grupo_id: int, concepto_id: int) -> int:
        """
        Actualiza (UPDATE) todos los movimientos que coincidan con el patrón (ILIKE)
        y que estén PENDIENTES de clasificación (alguno de los 3 campos es NULL).
        Retorna el número de filas afectadas.
        """
        pass

    @abstractmethod
    def obtener_desglose_gastos(self, 
                               nivel: str,
                               fecha_inicio: Optional[date] = None, 
                               fecha_fin: Optional[date] = None,
                               cuenta_id: Optional[int] = None,
                               tercero_id: Optional[int] = None,
                               grupo_id: Optional[int] = None,
                               concepto_id: Optional[int] = None,
                               grupos_excluidos: Optional[List[int]] = None
    ) -> List[dict]:
        """
        Obtiene el desglose de gastos para el reporte jerárquico.
        nivel: 'tercero', 'grupo', 'concepto'
        """
        pass

