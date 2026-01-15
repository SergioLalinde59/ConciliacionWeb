from dataclasses import dataclass
from typing import Optional

@dataclass
class CentroCosto:
    """Entidad de Dominio para Centro de Costos"""
    centro_costo_id: Optional[int]
    centro_costo: str
    activa: bool = True

    def __post_init__(self):
        if not self.centro_costo:
            raise ValueError("El nombre del centro de costos es obligatorio.")
