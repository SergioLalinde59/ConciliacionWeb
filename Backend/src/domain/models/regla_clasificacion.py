from dataclasses import dataclass
from typing import Optional

@dataclass
class ReglaClasificacion:
    """Regla para clasificar automáticamente un movimiento."""
    patron: str
    patron_descripcion: Optional[str] = None
    tercero_id: Optional[int] = None
    centro_costo_id: Optional[int] = None
    concepto_id: Optional[int] = None
    id: Optional[int] = None
    
    # Tipo de match: 'exacto', 'contiene', 'inicio'
    tipo_match: str = 'contiene' 
