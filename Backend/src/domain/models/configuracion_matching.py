from dataclasses import dataclass
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


@dataclass
class ConfiguracionMatching:
    """
    Entidad de Dominio que representa la configuración de parámetros
    del algoritmo de matching entre extracto y sistema.
    
    Arquitectura Hexagonal: Pertenece a la capa de Dominio.
    No tiene dependencias de infraestructura.
    """
    
    # Parámetros de Tolerancia
    tolerancia_valor: Decimal  # Tolerancia en pesos (ej: 100.00 COP)
    similitud_descripcion_minima: Decimal  # 0.00 a 1.00 (ej: 0.75 = 75%)
    
    # Pesos para Scoring (deben sumar 1.00)
    peso_fecha: Decimal  # ej: 0.40 = 40%
    peso_valor: Decimal  # ej: 0.40 = 40%
    peso_descripcion: Decimal  # ej: 0.20 = 20%
    
    # Umbral para Auto-vinculación
    score_minimo_exacto: Decimal  # ej: 0.95 = 95% para considerar EXACTO
    score_minimo_probable: Decimal  # ej: 0.70 = 70% para considerar PROBABLE
    
    # Metadata
    id: Optional[int] = None
    activo: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def __post_init__(self):
        """Validaciones de integridad de dominio"""
        
        # Convertir a Decimal si vienen como float
        for attr in ['tolerancia_valor', 'similitud_descripcion_minima', 
                     'peso_fecha', 'peso_valor', 'peso_descripcion',
                     'score_minimo_exacto', 'score_minimo_probable']:
            value = getattr(self, attr)
            if value is not None and not isinstance(value, Decimal):
                setattr(self, attr, Decimal(str(value)))
        
        # Validar que los pesos sumen 1.00 (con tolerancia de 0.01 por redondeo)
        suma_pesos = self.peso_fecha + self.peso_valor + self.peso_descripcion
        if abs(suma_pesos - Decimal('1.00')) > Decimal('0.01'):
            raise ValueError(
                f"Los pesos deben sumar 1.00, suma actual: {suma_pesos} "
                f"(fecha={self.peso_fecha}, valor={self.peso_valor}, descripcion={self.peso_descripcion})"
            )
        
        # Validar rangos de similitud y scores
        if not (Decimal('0.00') <= self.similitud_descripcion_minima <= Decimal('1.00')):
            raise ValueError(f"similitud_descripcion_minima debe estar entre 0.00 y 1.00, recibido: {self.similitud_descripcion_minima}")
        
        if not (Decimal('0.00') <= self.score_minimo_exacto <= Decimal('1.00')):
            raise ValueError(f"score_minimo_exacto debe estar entre 0.00 y 1.00, recibido: {self.score_minimo_exacto}")
        
        if not (Decimal('0.00') <= self.score_minimo_probable <= Decimal('1.00')):
            raise ValueError(f"score_minimo_probable debe estar entre 0.00 y 1.00, recibido: {self.score_minimo_probable}")
        
        # Validar que score_exacto >= score_probable
        if self.score_minimo_exacto < self.score_minimo_probable:
            raise ValueError(
                f"score_minimo_exacto ({self.score_minimo_exacto}) debe ser >= "
                f"score_minimo_probable ({self.score_minimo_probable})"
            )
        
        # Validar tolerancia_valor positiva
        if self.tolerancia_valor < Decimal('0.00'):
            raise ValueError(f"tolerancia_valor debe ser positiva, recibido: {self.tolerancia_valor}")
    
    def calcular_score_ponderado(
        self, 
        score_fecha: Decimal, 
        score_valor: Decimal, 
        score_descripcion: Decimal
    ) -> Decimal:
        """
        Calcula el score total ponderado dados los scores individuales.
        
        Args:
            score_fecha: Score de coincidencia de fecha (0.0 o 1.0)
            score_valor: Score de coincidencia de valor (0.0 a 1.0)
            score_descripcion: Score de similitud de descripción (0.0 a 1.0)
        
        Returns:
            Score total ponderado (0.0 a 1.0)
        """
        score_total = (
            score_fecha * self.peso_fecha +
            score_valor * self.peso_valor +
            score_descripcion * self.peso_descripcion
        )
        return score_total
    
    def es_match_exacto(self, score_total: Decimal) -> bool:
        """
        Determina si un score califica como match EXACTO.
        
        Args:
            score_total: Score total calculado
        
        Returns:
            True si el score es >= score_minimo_exacto
        """
        return score_total >= self.score_minimo_exacto
    
    def es_match_probable(self, score_total: Decimal) -> bool:
        """
        Determina si un score califica como match PROBABLE.
        
        Args:
            score_total: Score total calculado
        
        Returns:
            True si el score es >= score_minimo_probable pero < score_minimo_exacto
        """
        return self.score_minimo_probable <= score_total < self.score_minimo_exacto

    
    @staticmethod
    def crear_configuracion_default() -> 'ConfiguracionMatching':
        """
        Crea una configuración con valores por defecto.
        
        Returns:
            ConfiguracionMatching con valores estándar
        """
        return ConfiguracionMatching(
            tolerancia_valor=Decimal('100.00'),
            similitud_descripcion_minima=Decimal('0.75'),
            peso_fecha=Decimal('0.40'),
            peso_valor=Decimal('0.40'),
            peso_descripcion=Decimal('0.20'),
            score_minimo_exacto=Decimal('0.95'),
            score_minimo_probable=Decimal('0.70')
        )
    
    def __repr__(self) -> str:
        """Representación legible de la configuración"""
        return (
            f"ConfiguracionMatching("
            f"tolerancia=${float(self.tolerancia_valor):.2f}, "
            f"similitud_min={float(self.similitud_descripcion_minima):.0%}, "
            f"pesos=[{float(self.peso_fecha):.0%}, {float(self.peso_valor):.0%}, {float(self.peso_descripcion):.0%}], "
            f"scores=[exacto={float(self.score_minimo_exacto):.0%}, probable={float(self.score_minimo_probable):.0%}]"
            f")"
        )
