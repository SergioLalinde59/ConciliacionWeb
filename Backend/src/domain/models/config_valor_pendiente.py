from typing import Optional
from dataclasses import dataclass

@dataclass
class ConfigValorPendiente:
    """
    Representa un valor que semánticamente indica "pendiente de clasificar".
    
    Attributes:
        id: Identificador único (None para nuevos registros)
        tipo: Tipo de campo ('tercero', 'grupo', 'concepto')
        valor_id: ID del valor en la tabla correspondiente
        descripcion: Descripción del valor
        activo: Indica si este valor está activo
    """
    tipo: str
    valor_id: int
    descripcion: str = ""
    activo: bool = True
    id: Optional[int] = None
