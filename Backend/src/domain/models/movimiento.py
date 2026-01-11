from dataclasses import dataclass
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

@dataclass
class Movimiento:
    """
    Entidad de Dominio que representa un Movimiento Bancario.
    Centraliza la lógica de negocio y validaciones.
    """
    moneda_id: int
    cuenta_id: int
    fecha: date
    valor: Decimal
    descripcion: str
    
    # Campos opcionales / Nullables
    id: Optional[int] = None
    referencia: str = ""
    usd: Optional[Decimal] = None
    trm: Optional[Decimal] = None
    tercero_id: Optional[int] = None
    grupo_id: Optional[int] = None
    concepto_id: Optional[int] = None
    created_at: Optional[datetime] = None
    detalle: Optional[str] = None

    # Campos de visualización (poblados opcionalmente por joins)
    cuenta_nombre: Optional[str] = None
    moneda_nombre: Optional[str] = None
    tercero_nombre: Optional[str] = None
    grupo_nombre: Optional[str] = None
    concepto_nombre: Optional[str] = None

    def __post_init__(self):
        """Validaciones de integridad de dominio"""
        if not self.fecha:
            raise ValueError("La fecha es obligatoria")
        
        # En Python, 0.0 es truthy False para validaciones simples si no cuidamos el tipo
        if self.valor is None:
             raise ValueError("El valor es obligatorio")
             
        # Asegurar tipos Decimal para cálculos financieros precisos
        if not isinstance(self.valor, Decimal):
            try:
                self.valor = Decimal(str(self.valor))
            except:
                raise ValueError("El valor debe ser un número decimal válido")
                
        if self.usd is not None and not isinstance(self.usd, Decimal):
            self.usd = Decimal(str(self.usd))
            
        if self.trm is not None and not isinstance(self.trm, Decimal):
            self.trm = Decimal(str(self.trm))

    @property
    def es_gasto(self) -> bool:
        """Determina si es una salida de dinero (convención: negativo)"""
        return self.valor < 0

    @property
    def necesita_clasificacion(self) -> bool:
        """Regla de negocio: está pendiente si no tiene grupo o concepto"""
        return self.grupo_id is None or self.concepto_id is None
