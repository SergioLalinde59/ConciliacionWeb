from typing import List, Optional, Tuple
from decimal import Decimal
from datetime import date
from difflib import SequenceMatcher

from src.domain.models.movimiento_extracto import MovimientoExtracto
from src.domain.models.movimiento import Movimiento
from src.domain.models.movimiento_match import MovimientoMatch, MatchEstado
from src.domain.models.configuracion_matching import ConfiguracionMatching


class MatchingService:
    """
    Servicio de Dominio que implementa el algoritmo de matching
    entre movimientos del extracto bancario y movimientos del sistema.
    
    Arquitectura Hexagonal: Pertenece a la capa de Dominio.
    Contiene lógica de negocio pura, sin dependencias de infraestructura.
    """
    
    def ejecutar_matching(
        self,
        movs_extracto: List[MovimientoExtracto],
        movs_sistema: List[Movimiento],
        config: ConfiguracionMatching,
        todas_cuentas: Optional[List[int]] = None,
        aliases: Optional[List['MatchingAlias']] = None
    ) -> List[MovimientoMatch]:
        """
        Ejecuta el algoritmo de matching completo.
        
        Args:
            movs_extracto: Movimientos del extracto bancario
            movs_sistema: Movimientos del sistema
            config: Configuración de parámetros del algoritmo
            todas_cuentas: IDs de todas las cuentas (para detectar traslados)
            aliases: Lista de reglas de normalización (alias)
        
        Returns:
            Lista de MovimientoMatch con estados y scores asignados
        """
        resultados: List[MovimientoMatch] = []
        movs_sistema_disponibles = movs_sistema.copy()
        
        # Pre-procesar aliases para búsqueda rápida si es necesario
        # Pero como son pocos por cuenta, iteración directa está bien.
        aliases = aliases or []
        
        for mov_extracto in movs_extracto:
            # Buscar candidatos en sistema (mismo día o cercano)
            candidatos = self._buscar_candidatos(
                mov_extracto, 
                movs_sistema_disponibles,
                config
            )
            
            if not candidatos:
                # Sin candidatos: SIN_MATCH directamente
                
                estado = MatchEstado.SIN_MATCH
                
                match = MovimientoMatch(
                    mov_extracto=mov_extracto,
                    mov_sistema=None,
                    estado=estado,
                    score_total=Decimal('0.00'),
                    score_fecha=Decimal('0.00'),
                    score_valor=Decimal('0.00'),
                    score_descripcion=Decimal('0.00')
                )
                resultados.append(match)
                continue
            
            # Calcular scores para cada candidato
            mejor_match = None
            mejor_score = Decimal('0.00')
            
            for mov_sistema in candidatos:
                score_fecha = self.calcular_score_fecha(
                    mov_extracto.fecha, 
                    mov_sistema.fecha
                )
                
                score_valor = self.calcular_score_valor(
                    mov_extracto.valor,
                    mov_sistema.valor,
                    config.tolerancia_valor
                )
                
                score_descripcion = self.calcular_score_descripcion(
                    mov_extracto.descripcion,
                    mov_sistema.descripcion,
                    aliases
                )
                
                # Calcular score total ponderado
                score_total = config.calcular_score_ponderado(
                    score_fecha,
                    score_valor,
                    score_descripcion
                )

                # ELEGANT MATCHING RULE: Strong Identity Match
                # If Date and Value are identical (score 1.0), but description differs,
                # we treat it as a strong PROBABLE match.
                if score_fecha == Decimal('1.00') and score_valor == Decimal('1.00'):
                    # Force score to be high enough to be PROBABLE (e.g. 0.85 or based on config)
                    # Using 0.85 as a safe default for "High Probability"
                    min_probable = Decimal('0.85')
                    if score_total < min_probable:
                        score_total = min_probable
                
                # Guardar si es el mejor hasta ahora
                if score_total > mejor_score:
                    mejor_score = score_total
                    mejor_match = (mov_sistema, score_fecha, score_valor, score_descripcion)
            
            # Determinar estado basado en score
            if mejor_match and mejor_score >= config.similitud_descripcion_minima:
                mov_sistema, score_fecha, score_valor, score_descripcion = mejor_match
                
                estado = self._determinar_estado_match(mejor_score, config)
                
                match = MovimientoMatch(
                    mov_extracto=mov_extracto,
                    mov_sistema=mov_sistema,
                    estado=estado,
                    score_total=mejor_score,
                    score_fecha=score_fecha,
                    score_valor=score_valor,
                    score_descripcion=score_descripcion
                )
                
                # Remover de disponibles si es EXACTO (auto-vincular)
                if estado == MatchEstado.EXACTO:
                    movs_sistema_disponibles.remove(mov_sistema)
                
                resultados.append(match)
            else:
                # Score muy bajo: SIN_MATCH
                
                estado = MatchEstado.SIN_MATCH
                
                match = MovimientoMatch(
                    mov_extracto=mov_extracto,
                    mov_sistema=None,
                    estado=estado,
                    score_total=Decimal('0.00'),
                    score_fecha=Decimal('0.00'),
                    score_valor=Decimal('0.00'),
                    score_descripcion=Decimal('0.00')
                )
                resultados.append(match)
        
        return resultados
    
    def calcular_score_fecha(self, fecha1: date, fecha2: date) -> Decimal:
        """
        Calcula score de coincidencia de fecha.
        
        Args:
            fecha1: Primera fecha a comparar
            fecha2: Segunda fecha a comparar
        
        Returns:
            1.0 si coinciden exactamente, 0.0 si no
        """
        return Decimal('1.00') if fecha1 == fecha2 else Decimal('0.00')
    
    def calcular_score_valor(
        self, 
        valor1: Decimal, 
        valor2: Decimal, 
        tolerancia: Decimal
    ) -> Decimal:
        """
        Calcula score de coincidencia de valor con tolerancia.
        
        Args:
            valor1: Primer valor a comparar
            valor2: Segundo valor a comparar
            tolerancia: Margen de error aceptable
        
        Returns:
            Score de 0.0 a 1.0 basado en diferencia vs tolerancia
        """
        diferencia = abs(valor1 - valor2)
        
        if diferencia == 0:
            return Decimal('1.00')
        
        if diferencia > tolerancia:
            return Decimal('0.00')
        
        # Score lineal: 1.0 - (diferencia / tolerancia)
        score = Decimal('1.00') - (diferencia / tolerancia)
        return max(Decimal('0.00'), min(Decimal('1.00'), score))
    
    def calcular_score_descripcion(
            self, 
            desc1: str, 
            desc2: str,
            aliases: Optional[List['MatchingAlias']] = None
        ) -> Decimal:
        """
        Calcula score de similitud de descripción usando algoritmo de texto.
        
        Lógica de Normalización (Traducción):
        1. Se toma la descripción del EXTRACTO (desc1).
        2. Si coincide con un patrón de Regla, se transforma a la "Descripción Esperada del Sistema".
        3. Se compara esta "Descripción Esperada" contra la DESCRIPCIÓN REAL DEL SISTEMA (desc2).
        
        Args:
            desc1: Descripción del Extracto (Fuente)
            desc2: Descripción del Sistema (Destino a comparar)
            aliases: Lista de reglas de normalización
        
        Returns:
            Score de 0.0 a 1.0 basado en similitud de texto
        """
        if not desc1 or not desc2:
            return Decimal('0.00')
        
        # Normalizar textos base
        desc1_norm = desc1.upper().strip()  # EXTRACTO
        desc2_norm = desc2.upper().strip()  # SISTEMA
        
        # Aplicar reglas SOLO al Extracto para proyectar lo que "Debería decir el Sistema"
        desc_esperada_sistema = desc1_norm
        
        if aliases:
            for alias in aliases:
                # El patrón del alias (ej. "ADICION") se busca en el Extracto
                if alias.patron in desc1_norm:
                    # Se reemplaza por el texto del Sistema (ej. "TRASLADO DESDE CUENTA")
                    # Usamos replace para permitir coincidencias parciales si el patrón es solo una parte
                    desc_esperada_sistema = desc1_norm.replace(alias.patron, alias.reemplazo)
        
        # Usar SequenceMatcher para comparar lo que ESPERAMOS vs lo que TENEMOS
        similitud = SequenceMatcher(None, desc_esperada_sistema, desc2_norm).ratio()
        
        return Decimal(str(round(similitud, 2)))
    
    def _buscar_candidatos(
        self,
        mov_extracto: MovimientoExtracto,
        movs_sistema: List[Movimiento],
        config: ConfiguracionMatching
    ) -> List[Movimiento]:
        """
        Busca candidatos en sistema para un movimiento del extracto.
        
        Filtra por fecha (mismo día o ±1 día) para optimizar.
        
        Args:
            mov_extracto: Movimiento del extracto
            movs_sistema: Lista de movimientos del sistema disponibles
            config: Configuración
        
        Returns:
            Lista de candidatos potenciales
        """
        candidatos = []
        
        for mov_sistema in movs_sistema:
            # Filtro por fecha: mismo día o ±1 día
            diferencia_dias = abs((mov_extracto.fecha - mov_sistema.fecha).days)
            
            if diferencia_dias <= 1:  # Mismo día o adyacente
                candidatos.append(mov_sistema)
        
        return candidatos
    
    def _determinar_estado_match(
        self, 
        score_total: Decimal, 
        config: ConfiguracionMatching
    ) -> MatchEstado:
        """
        Determina el estado del match basado en el score total.
        
        Args:
            score_total: Score total calculado
            config: Configuración con umbrales
        
        Returns:
            MatchEstado correspondiente
        """
        if config.es_match_exacto(score_total):
            return MatchEstado.EXACTO
        elif config.es_match_probable(score_total):
            return MatchEstado.PROBABLE
        else:
            return MatchEstado.SIN_MATCH
    

