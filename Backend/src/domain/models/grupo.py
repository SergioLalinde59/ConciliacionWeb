from dataclasses import dataclass
from typing import Optional

@dataclass
class Grupo:
    """Entidad de Dominio para Grupos"""
    grupoid: Optional[int]
    grupo: str
    activa: bool = True

    def __post_init__(self):
        if not self.grupo:
            raise ValueError("El nombre del grupo es obligatorio.")
