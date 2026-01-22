from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class MatchingAlias:
    """
    Entidad de Dominio que representa una Regla de Normalización (Alias).
    Permite definir equivalencias de descripción para el algoritmo de matching.
    """
    cuenta_id: int
    patron: str
    reemplazo: str
    
    # Campos opcionales
    id: Optional[int] = None
    created_at: Optional[datetime] = None

    def __post_init__(self):
        """Validaciones de integridad"""
        if not self.patron or not self.patron.strip():
            raise ValueError("El patrón de búsqueda es obligatorio")
        if not self.reemplazo or not self.reemplazo.strip():
            raise ValueError("El texto de reemplazo es obligatorio")
        
        # Normalizar a mayúsculas para consistencia
        self.patron = self.patron.strip().upper()
        self.reemplazo = self.reemplazo.strip().upper()
