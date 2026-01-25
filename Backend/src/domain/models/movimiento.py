from typing import Optional, List, TYPE_CHECKING
from datetime import date, datetime
from decimal import Decimal
from dataclasses import dataclass, field

if TYPE_CHECKING:
    from src.domain.models.movimiento_detalle import MovimientoDetalle

@dataclass
class Movimiento:
    """
    Entidad de Dominio que representa un Movimiento Bancario (Encabezado).
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
    created_at: Optional[datetime] = None
    detalle: Optional[str] = None
    
    # [NEW] Detalles
    detalles: List['MovimientoDetalle'] = field(default_factory=list)

    # Campos de visualización (poblados opcionalmente por joins)
    cuenta_nombre: Optional[str] = None
    moneda_nombre: Optional[str] = None
    # Estos nombres ahora vendrían del primer detalle o concatenados, 
    # se mantienen para compatibilidad de vistas simples, pero podrian ser removidos o calculados.
    # [REMOVED from dataclass fields, converted to properties below]

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
        """Regla de negocio: está pendiente si no tiene detalles o están incompletos"""
        if not self.detalles:
            return True
            
        # Verificar que la suma de detalles cuadre con el total (opcional, pero buena práctica)
        # Por simplicidad ahora: si tiene detalles, verificamos si CUALQUIERA de ellos está incompleto.
        # Un detalle está incompleto si le falta centro_costo o concepto.
        for d in self.detalles:
            if d.centro_costo_id is None or d.concepto_id is None:
                return True
                
        return False
    
    # --- Propiedades de Compatibilidad (Legacy) ---
    @property
    def centro_costo_id(self) -> Optional[int]:
        """Devuelve el centro de costo del primer detalle (compatibilidad)"""
        return self.detalles[0].centro_costo_id if self.detalles else None
    
    @centro_costo_id.setter
    def centro_costo_id(self, value: Optional[int]):
        """Asigna centro de costo al primer detalle (o crea uno)"""
        if not self.detalles:
            self.detalles.append(MovimientoDetalle(
                valor=self.valor,
                centro_costo_id=value,
                concepto_id=None,
                tercero_id=None
            ))
        else:
            self.detalles[0].centro_costo_id = value
        
    @property
    def concepto_id(self) -> Optional[int]:
        """Devuelve el concepto del primer detalle (compatibilidad)"""
        return self.detalles[0].concepto_id if self.detalles else None
    
    @concepto_id.setter
    def concepto_id(self, value: Optional[int]):
        """Asigna concepto al primer detalle (o crea uno)"""
        if not self.detalles:
            self.detalles.append(MovimientoDetalle(
                valor=self.valor,
                centro_costo_id=None,
                concepto_id=value,
                tercero_id=None
            ))
        else:
            self.detalles[0].concepto_id = value
        
    @property
    def tercero_id(self) -> Optional[int]:
        """Devuelve el tercero del primer detalle (compatibilidad)"""
        return self.detalles[0].tercero_id if self.detalles else None

    @tercero_id.setter
    def tercero_id(self, value: Optional[int]):
        """Asigna tercero al primer detalle (o crea uno)"""
        if not self.detalles:
            self.detalles.append(MovimientoDetalle(
                valor=self.valor,
                centro_costo_id=None,
                concepto_id=None,
                tercero_id=value
            ))
        else:
            self.detalles[0].tercero_id = value

    @property
    def tercero_nombre(self) -> Optional[str]:
        """Devuelve el nombre del tercero del primer detalle"""
        return self.detalles[0].tercero_nombre if self.detalles else None

    @property
    def centro_costo_nombre(self) -> Optional[str]:
        """Devuelve el nombre del centro de costo del primer detalle"""
        return self.detalles[0].centro_costo_nombre if self.detalles else None

    @property
    def concepto_nombre(self) -> Optional[str]:
        """Devuelve el nombre del concepto del primer detalle"""
        return self.detalles[0].concepto_nombre if self.detalles else None

