from typing import Optional
from dataclasses import dataclass

@dataclass
class ConfigFiltroGrupo:
    """
    Representa la configuración de un filtro de exclusión de grupos.
    
    Attributes:
        id: Identificador único del filtro (None para nuevos registros)
        grupo_id: ID del grupo al que se aplica el filtro
        etiqueta: Etiqueta descriptiva del filtro (ej: "Excluir Préstamos")
        activo_por_defecto: Indica si el filtro está activo por defecto
    """
    grupo_id: int
    etiqueta: str
    activo_por_defecto: bool = True
    id: Optional[int] = None
