from dataclasses import dataclass
from typing import Optional

@dataclass
class Concepto:
    """Entidad de Dominio para Conceptos"""
    conceptoid: Optional[int]
    concepto: str
    centro_costo_id: Optional[int] = None
    activa: bool = True

    def __post_init__(self):
        if not self.concepto:
            raise ValueError("El nombre del concepto es obligatorio.")
