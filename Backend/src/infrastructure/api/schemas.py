from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal

class MovimientoDTO(BaseModel):
    id: Optional[int]
    fecha: date
    descripcion: str
    referencia: Optional[str] = ""
    valor: Decimal
    tercero_id: Optional[int] = None
    grupo_id: Optional[int] = None
    concepto_id: Optional[int] = None

    class Config:
        from_attributes = True
