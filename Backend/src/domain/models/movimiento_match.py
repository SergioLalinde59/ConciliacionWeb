from dataclasses import dataclass
from typing import Optional
from datetime import datetime
from decimal import Decimal
from enum import Enum

from src.domain.models.movimiento_extracto import MovimientoExtracto
from src.domain.models.movimiento import Movimiento


class MatchEstado(str, Enum):
    """Estados posibles de un matching entre extracto y sistema"""
    EXACTO = "EXACTO"           # Match perfecto automático (score >= 95%)
    PROBABLE = "PROBABLE"       # Match sugerido por algoritmo (score >= 70%)
    MANUAL = "MANUAL"           # Vinculado manualmente por usuario
    # TRASLADO eliminado de lógica de matching (ahora es creación de movimiento)
    SIN_MATCH = "SIN_MATCH"     # Sin coincidencia encontrada
    IGNORADO = "IGNORADO"       # Usuario marcó como no relevante


@dataclass
class MovimientoMatch:
    """
    Entidad de Dominio que representa el resultado de matching
    entre un movimiento del extracto bancario y un movimiento del sistema.
    
    Arquitectura Hexagonal: Pertenece a la capa de Dominio.
    No tiene dependencias de infraestructura.
    """
    
    # Movimientos relacionados
    mov_extracto: MovimientoExtracto
    mov_sistema: Optional[Movimiento]  # None si es SIN_MATCH o IGNORADO
    
    # Estado del match
    estado: MatchEstado
    
    # Scores del algoritmo (0.00 a 1.00)
    score_total: Decimal
    score_fecha: Decimal
    score_valor: Decimal
    score_descripcion: Decimal
    
    # Confirmación del usuario
    confirmado_por_usuario: bool = False
    fecha_confirmacion: Optional[datetime] = None
    
    # Auditoría
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    created_by: Optional[str] = None
    notas: Optional[str] = None
    
    def __post_init__(self):
        """Validaciones de integridad de dominio"""
        
        # Validar que scores estén en rango válido
        for score_name in ['score_total', 'score_fecha', 'score_valor', 'score_descripcion']:
            score = getattr(self, score_name)
            if score is not None and not (Decimal('0.00') <= score <= Decimal('1.00')):
                raise ValueError(f"{score_name} debe estar entre 0.00 y 1.00, recibido: {score}")
        
        # Validar consistencia de estado
        if self.estado in [MatchEstado.SIN_MATCH, MatchEstado.IGNORADO]:
            if self.mov_sistema is not None:
                raise ValueError(f"Estado {self.estado} no debe tener movimiento del sistema asociado")
        
        # Convertir scores a Decimal si vienen como float
        for attr in ['score_total', 'score_fecha', 'score_valor', 'score_descripcion']:
            value = getattr(self, attr)
            if value is not None and not isinstance(value, Decimal):
                setattr(self, attr, Decimal(str(value)))
    
    @property
    def es_exacto(self) -> bool:
        """Indica si es un match exacto"""
        return self.estado == MatchEstado.EXACTO
    
    @property
    def es_probable(self) -> bool:
        """Indica si es un match probable que requiere revisión"""
        return self.estado == MatchEstado.PROBABLE
    
    @property
    def requiere_revision(self) -> bool:
        """Indica si requiere revisión manual del usuario"""
        # SIN_MATCH ahora siempre requiere acción (crear o vincular manual)
        return not self.confirmado_por_usuario
    
    @property
    def esta_vinculado(self) -> bool:
        """Indica si tiene un movimiento del sistema vinculado"""
        return self.mov_sistema is not None
    
    @property
    def puede_auto_vincular(self) -> bool:
        """Indica si puede vincularse automáticamente (score muy alto)"""
        return self.score_total >= Decimal('0.95') and not self.confirmado_por_usuario
    
    def confirmar(self, usuario: str, notas: Optional[str] = None):
        """
        Marca la vinculación como confirmada por el usuario.
        
        Args:
            usuario: Identificador del usuario que confirma
            notas: Notas opcionales sobre la confirmación
        """
        self.confirmado_por_usuario = True
        self.fecha_confirmacion = datetime.now()
        self.created_by = usuario
        if notas:
            self.notas = notas
    
    def marcar_como_ignorado(self, usuario: str, razon: Optional[str] = None):
        """
        Marca el movimiento como ignorado.
        
        Args:
            usuario: Identificador del usuario
            razon: Razón por la cual se ignora
        """
        self.estado = MatchEstado.IGNORADO
        self.mov_sistema = None
        self.confirmar(usuario, razon)
    
    def __repr__(self) -> str:
        """Representación legible del match"""
        extracto_desc = self.mov_extracto.descripcion[:30] if self.mov_extracto else "N/A"
        sistema_desc = self.mov_sistema.descripcion[:30] if self.mov_sistema else "N/A"
        return (
            f"MovimientoMatch("
            f"estado={self.estado.value}, "
            f"score={float(self.score_total):.2f}, "
            f"extracto='{extracto_desc}...', "
            f"sistema='{sistema_desc}...')"
        )
