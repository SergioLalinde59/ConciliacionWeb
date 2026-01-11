from dataclasses import dataclass
from typing import Optional

@dataclass
class Cuenta:
    """Entidad de Dominio para Cuentas"""
    cuentaid: Optional[int]
    cuenta: str
    activa: bool = True
    permite_carga: bool = False

    def __post_init__(self):
        if not self.cuenta:
            raise ValueError("El nombre de la cuenta es obligatorio.")
