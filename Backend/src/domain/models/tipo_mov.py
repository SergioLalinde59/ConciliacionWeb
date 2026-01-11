from dataclasses import dataclass
from typing import Optional

@dataclass
class TipoMov:
    """Entidad de Dominio para Tipos de Movimiento"""
    tipomovid: Optional[int]
    tipomov: str
    activa: bool = True

    def __post_init__(self):
        if not self.tipomov:
            raise ValueError("El tipo de movimiento es obligatorio.")
