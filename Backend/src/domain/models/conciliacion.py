from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional, Dict, Any
from decimal import Decimal

@dataclass
class Conciliacion:
    """
    Entidad de Dominio para Conciliaciones Bancarias.
    Representa la comparación entre el Extracto Bancario y los Movimientos del Sistema.
    """
    id: Optional[int]
    cuenta_id: int
    year: int
    month: int
    fecha_corte: date
    
    # --- Verdad del Extracto (Input Manual) ---
    extracto_saldo_anterior: Decimal = Decimal('0.00')
    extracto_entradas: Decimal = Decimal('0.00')
    extracto_salidas: Decimal = Decimal('0.00')
    extracto_saldo_final: Decimal = Decimal('0.00')
    
    # --- Verdad del Sistema (Calculado) ---
    sistema_entradas: Decimal = Decimal('0.00')
    sistema_salidas: Decimal = Decimal('0.00')
    sistema_saldo_final: Decimal = Decimal('0.00')
    
    # --- Diferencias y Estado ---
    diferencia_saldo: Optional[Decimal] = None # Calculado en BD usually, pero útil en modelo
    datos_extra: Dict[str, Any] = field(default_factory=dict)
    estado: str = 'PENDIENTE'
    updated_at: Optional[datetime] = None
    
    # --- Campos de lectura (Join) ---
    cuenta_nombre: Optional[str] = None

    @property
    def calculo_cuadra(self) -> bool:
        """Valida si matemáticamente el extracto tiene sentido interno (SaldoAnt + Entradas - Salidas = SaldoFinal)"""
        calculado = self.extracto_saldo_anterior + self.extracto_entradas - self.extracto_salidas
        return abs(calculado - self.extracto_saldo_final) < Decimal('0.01')

    @property
    def periodo_texto(self) -> str:
        """Retorna el periodo en formato legible: 'YYYY - Mes'"""
        meses = [
            "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ]
        mes_nombre = meses[self.month] if 1 <= self.month <= 12 else "Desconocido"
        return f"{self.year} - {mes_nombre}"
    
    @property
    def conciliacion_ok(self) -> bool:
        """Valida si el sistema coincide con el extracto"""
        if self.diferencia_saldo is None:
            return False
        return abs(self.diferencia_saldo) < Decimal('0.01')
