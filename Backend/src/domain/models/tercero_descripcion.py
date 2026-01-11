from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class TerceroDescripcion:
    """Representa un alias/descripción de un tercero."""
    terceroid: int
    descripcion: Optional[str] = None
    referencia: Optional[str] = None
    id: Optional[int] = None
    activa: bool = True
    created_at: Optional[datetime] = None
