from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class CuentaExtractor(BaseModel):
    id: Optional[int]
    cuenta_id: int
    tipo: str
    modulo: str
    orden: int
    activo: bool
    created_at: Optional[datetime] = None
