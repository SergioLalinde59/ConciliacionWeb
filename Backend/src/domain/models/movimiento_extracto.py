from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional
from decimal import Decimal
@dataclass
class MovimientoExtracto:
    """
    Entidad de Dominio para Movimientos del Extracto Bancario.
    Representa un movimiento individual reportado en el extracto PDF.
    
    El cuenta_id se asigna desde el contexto de carga del extracto
    (el usuario selecciona la cuenta en el frontend).
    """
    id: Optional[int]
    cuenta_id: int  # Viene del parámetro al cargar extracto
    year: int       # Extraído del PDF
    month: int      # Extraído del PDF
    fecha: date
    descripcion: str
    referencia: Optional[str]
    valor: Decimal  # Positivo = entrada, Negativo = salida
    usd: Optional[Decimal] = None
    trm: Optional[Decimal] = None
    numero_linea: Optional[int] = None
    raw_text: Optional[str] = None
    created_at: Optional[datetime] = None
    
    # Campo de lectura (Join)
    cuenta: Optional[str] = None