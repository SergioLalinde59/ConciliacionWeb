from dataclasses import dataclass
from typing import Optional

@dataclass
class ReglaClasificacion:
    """Regla para clasificar automáticamente un movimiento."""
    patron: str
    tercero_id: Optional[int]
    grupo_id: Optional[int]
    concepto_id: Optional[int]
    id: Optional[int] = None
    
    # Tipo de match: 'exacto', 'contiene', 'inicio'
    tipo_match: str = 'contiene' 
