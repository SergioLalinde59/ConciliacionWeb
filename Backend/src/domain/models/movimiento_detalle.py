from dataclasses import dataclass
from typing import Optional
from decimal import Decimal
from datetime import datetime

@dataclass
class MovimientoDetalle:
    """
    Entidad de Dominio que representa el desglose contable de un movimiento.
    Permite imputar un mismo movimiento bancario a múltiples centros de costo/conceptos.
    """
    valor: Decimal
    centro_costo_id: Optional[int]
    concepto_id: Optional[int]
    tercero_id: Optional[int]
    
    # Optional fields
    id: Optional[int] = None
    movimiento_id: Optional[int] = None
    created_at: Optional[datetime] = None
    
    # Join fields (read-only)
    centro_costo_nombre: Optional[str] = None
    concepto_nombre: Optional[str] = None
    tercero_nombre: Optional[str] = None
    
    def __post_init__(self):
        if self.valor is None:
            raise ValueError("El valor del detalle es obligatorio")
        
        if not isinstance(self.valor, Decimal):
            self.valor = Decimal(str(self.valor))
