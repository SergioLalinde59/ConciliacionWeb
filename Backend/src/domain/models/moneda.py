from dataclasses import dataclass
from typing import Optional

@dataclass
class Moneda:
    """Entidad de Dominio para Monedas"""
    monedaid: Optional[int]
    isocode: str
    moneda: str
    activa: bool = True

    def __post_init__(self):
        if not self.isocode:
            raise ValueError("El código ISO es obligatorio.")
        if not self.moneda:
            raise ValueError("El nombre de la moneda es obligatorio.")
