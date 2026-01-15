from typing import Optional
from dataclasses import dataclass

@dataclass
class ConfigFiltroCentroCosto:
    """
    Representa la configuración de un filtro de exclusión de centros de costos.
    
    Attributes:
        id: Identificador único del filtro (None para nuevos registros)
        centro_costo_id: ID del centro de costos al que se aplica el filtro
        etiqueta: Etiqueta descriptiva del filtro (ej: "Excluir Préstamos")
        activo_por_defecto: Indica si el filtro está activo por defecto
    """
    centro_costo_id: int
    etiqueta: str
    activo_por_defecto: bool = True
    id: Optional[int] = None
