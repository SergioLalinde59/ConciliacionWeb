from typing import List, Optional, Tuple
from decimal import Decimal
import os
from difflib import SequenceMatcher
from src.domain.models.movimiento import Movimiento
from src.domain.ports.movimiento_repository import MovimientoRepository
from src.domain.ports.reglas_repository import ReglasRepository
from src.domain.ports.tercero_repository import TerceroRepository
from src.domain.ports.tercero_descripcion_repository import TerceroDescripcionRepository
from src.domain.ports.centro_costo_repository import CentroCostoRepository
from src.domain.ports.concepto_repository import ConceptoRepository

def calcular_similitud_texto(texto1: str, texto2: str) -> float:
    """
    Calcula la similitud entre dos textos usando SequenceMatcher.
    Retorna un valor entre 0 y 100 (porcentaje de similitud).
    """
    if not texto1 or not texto2:
        return 0.0
    
    # Normalizar textos: minúsculas y sin espacios extras
    t1 = " ".join(texto1.lower().split())
    t2 = " ".join(texto2.lower().split())
    
    # Calcular similitud
    ratio = SequenceMatcher(None, t1, t2).ratio()
    return ratio * 100

def calcular_similitud_palabras(texto1: str, texto2: str) -> float:
    """
    Calcula similitud basada en palabras compartidas usando el coeficiente de Jaccard.
    Retorna un valor entre 0 y 100 (porcentaje de similitud).
    
    Esta métrica es más robusta para textos con palabras en diferente orden.
    Ejemplo: "PAGO TC MASTER" vs "MASTER TC PAGO" → alta similitud
    """
    if not texto1 or not texto2:
        return 0.0
    
    # Normalizar y extraer palabras
    palabras1 = set(texto1.lower().split())
    palabras2 = set(texto2.lower().split())
    
    # Eliminar palabras muy cortas (1-2 caracteres) que no aportan significado
    palabras1 = {p for p in palabras1 if len(p) > 2}
    palabras2 = {p for p in palabras2 if len(p) > 2}
    
    if not palabras1 or not palabras2:
        return 0.0
    
    # Coeficiente de Jaccard: |intersección| / |unión|
    comunes = palabras1.intersection(palabras2)
    union = palabras1.union(palabras2)
    
    return (len(comunes) / len(union)) * 100

def calcular_similitud_hibrida(texto1: str, texto2: str) -> float:
    """
    Combina similitud de palabras (Jaccard) y similitud de secuencia (SequenceMatcher).
    
    Pesos:
    - 60% similitud de palabras (más importante para coincidencias conceptuales)
    - 40% similitud de secuencia (importante para orden y estructura)
    
    Retorna un valor entre 0 y 100 (porcentaje de similitud).
    """
    sim_palabras = calcular_similitud_palabras(texto1, texto2)
    sim_secuencia = calcular_similitud_texto(texto1, texto2)
    
    # Peso: 60% palabras, 40% secuencia
    return (sim_palabras * 0.6) + (sim_secuencia * 0.4)


class ClasificacionService:
    """
    Servicio de Aplicación para clasificar movimientos automáticamente.
    Combina Reglas Estáticas y Aprendizaje Histórico.
    """
    
    def __init__(self, 
                 movimiento_repo: MovimientoRepository,
                 reglas_repo: ReglasRepository,
                 tercero_repo: TerceroRepository,
                 tercero_descripcion_repo: TerceroDescripcionRepository = None,
                 concepto_repo: ConceptoRepository = None,
                 centro_costo_repo: CentroCostoRepository = None):
        self.movimiento_repo = movimiento_repo
        self.reglas_repo = reglas_repo
        self.tercero_repo = tercero_repo
        self.tercero_descripcion_repo = tercero_descripcion_repo
        self.concepto_repo = concepto_repo
        self.centro_costo_repo = centro_costo_repo

    def clasificar_movimiento(self, movimiento: Movimiento) -> Tuple[bool, str]:
        """
        Intenta clasificar un movimiento.
        Retorna (exito, razon).
        Modifica el objeto movimiento en sitio si tiene éxito.
        """
        # Si ya está clasificado, no hacer nada
        if not movimiento.necesita_clasificacion:
             return False, "Ya clasificado"

        # 1. Estrategia: Reglas Estáticas (Alta prioridad)
        # ------------------------------------------------
        
        # Obtener y ordenar reglas: 
        # Las reglas con cuenta_id específica deben evaluarse PRIMERO que las globales (None)
        reglas = self.reglas_repo.obtener_todos()
        # Ordenar: x.cuenta_id is not None (True=1, False=0) descendente -> Primero las que tienen cuenta
        reglas.sort(key=lambda x: x.cuenta_id is not None, reverse=True)
        
        for regla in reglas:
            # 1.1 Filtro por Cuenta (Si la regla especifica cuenta, debe coincidir)
            if regla.cuenta_id is not None:
                if movimiento.cuenta_id != regla.cuenta_id:
                    continue # No aplica esta regla para esta cuenta
            
            # 1.2 Coincidencia de Patrón
            coincide = False
            texto_upper = (movimiento.descripcion or "").upper()
            patron_upper = regla.patron.upper()
            
            if regla.tipo_match == 'contiene':
                if patron_upper in texto_upper: coincide = True
            elif regla.tipo_match == 'inicio':
                if texto_upper.startswith(patron_upper): coincide = True
            elif regla.tipo_match == 'exacto':
                if texto_upper == patron_upper: coincide = True
                
            if coincide:
                modificado = False
                if regla.tercero_id and not movimiento.tercero_id:
                    movimiento.tercero_id = regla.tercero_id
                    # Propagar al detalle si es único (consistencia)
                    if len(movimiento.detalles) == 1:
                        movimiento.detalles[0].tercero_id = regla.tercero_id
                    modificado = True
                if regla.centro_costo_id and not movimiento.centro_costo_id:
                    movimiento.centro_costo_id = regla.centro_costo_id
                    modificado = True
                if regla.concepto_id and not movimiento.concepto_id:
                    movimiento.concepto_id = regla.concepto_id
                    modificado = True
                
                if modificado:
                    tipo_regla = "Cuenta Específica" if regla.cuenta_id else "Global"
                    return True, f"Regla estática [{tipo_regla}]: '{regla.patron}'"

        # 2. Estrategia: Histórico por Referencia
        # ---------------------------------------
        if movimiento.referencia:
            # Buscar movimientos previos con la misma referencia que ya estén clasificados
            similares = self.movimiento_repo.buscar_por_referencia(movimiento.referencia)
            
            # Filtrar el propio movimiento si ya existe y quedarse con los que tengan clasificación
            candidatos = [
                m for m in similares 
                if m.id != movimiento.id 
                and not m.necesita_clasificacion # que tenga grupo y concepto
            ]
            
            if candidatos:
                # Tomar el más reciente
                mejor_candidato = candidatos[0] # Asumimos que repo devuelve ordenados, sino ordenar
                
                movimiento.tercero_id = mejor_candidato.tercero_id
                # Propagar al detalle si es único
                if len(movimiento.detalles) == 1:
                    movimiento.detalles[0].tercero_id = mejor_candidato.tercero_id
                movimiento.centro_costo_id = mejor_candidato.centro_costo_id
                movimiento.concepto_id = mejor_candidato.concepto_id
                return True, f"Histórico por Referencia ({movimiento.referencia})"
        
        # 3. Estrategia: Catálogo Externo por Referencia (>8 dígitos)
        # -------------------------------------------------------
        # Nueva ubicación (antes en Pipeline): Si está en catálogo oficial, es match seguro.
        if (movimiento.referencia and len(movimiento.referencia) > 8 
            and movimiento.referencia.isdigit() and self.tercero_descripcion_repo):
            
            td = self.tercero_descripcion_repo.buscar_por_referencia(movimiento.referencia)
            if td:
                movimiento.tercero_id = td.terceroid
                # Propagar al detalle si es único
                if len(movimiento.detalles) == 1:
                    movimiento.detalles[0].tercero_id = td.terceroid
                return True, f"Referencia Catálogo Exacta: {movimiento.referencia}"

        return False, "Sin coincidencias"

    def auto_clasificar_pendientes(self) -> dict:
        """
        Busca todos los pendientes y trata de clasificarlos.
        Guarda los cambios inmediatamente.
        """
        pendientes = self.movimiento_repo.buscar_pendientes_clasificacion()
        resumen = {'total': len(pendientes), 'clasificados': 0, 'detalles': []}
        
        for mov in pendientes:
            exito, razon = self.clasificar_movimiento(mov)
            if exito:
                self.movimiento_repo.guardar(mov)
                resumen['clasificados'] += 1
                resumen['detalles'].append(f"ID {mov.id}: {razon}")
        
        return resumen

    def obtener_sugerencia_clasificacion(self, movimiento_id: int) -> dict:
        """
        [PIPELINE UNIFICADO]
        Calcula una sugerencia de clasificación usando múltiples estrategias simultáneas
        y un sistema de ranking/scoring unificado.
        
        Score Final = (SimilitudTexto * 0.7) + (SimilitudValor * 0.3)
        """
        movimiento = self.movimiento_repo.obtener_por_id(movimiento_id)
        if not movimiento:
            raise ValueError(f"Movimiento {movimiento_id} no encontrado")
            
        # Initialize suggestion with CURRENT movement values (preserve existing classification)
        sugerencia = {
            'tercero_id': movimiento.tercero_id, 
            'centro_costo_id': movimiento.centro_costo_id, 
            'concepto_id': movimiento.concepto_id,
            'razon': None,
            'tipo_match': None
        }
        
        # Mapa de candidatos unificado: {id: {'mov': obj, 'origen': set(), 'score_cobertura': 0}}
        candidatos_map = {}
        
        print(f"\n🚀 INICIANDO PIPELINE DE CLASIFICACIÓN para ID {movimiento_id}")
        print(f"   Descripción: '{movimiento.descripcion}'")
        print(f"   Valor: {movimiento.valor}")
        print(f"   Tercero actual: {movimiento.tercero_id}")
        
        referencia_no_existe = False
        
        # ============================================
        # 0.1. ESTRATEGIA: CONTEXTO PARA TERCERO EXISTENTE
        # ============================================
        # Si el movimiento YA tiene un tercero_id asignado, buscar su historial
        # para mostrar en el contexto (esto ayuda aunque la descripción no coincida)
        if movimiento.tercero_id and not match_referencia_encontrado:
            print(f"   📋 Movimiento ya tiene TerceroID {movimiento.tercero_id}, buscando historial...")
            cands_tercero_existente, _ = self.movimiento_repo.buscar_avanzado(
                tercero_id=movimiento.tercero_id, 
                limit=20
            )
            for m in cands_tercero_existente:
                if m.id != movimiento.id:
                    if m.id not in candidatos_map:
                        candidatos_map[m.id] = {'mov': m, 'origen': {'tercero_existente'}, 'score_cobertura': 5}
                    else:
                        candidatos_map[m.id]['origen'].add('tercero_existente')
                        candidatos_map[m.id]['score_cobertura'] += 5

        # ============================================
        # 0. ESTRATEGIA: REFERENCIA EXACTA (>8 DÍGITOS) - PRIORIDAD MÁXIMA
        # ============================================
        # Según reglas de negocio: Si la referencia tiene más de 8 dígitos, buscar en catálogo específico.
        # Si existe, ese ES el tercero y el historial debe ser de ese tercero.
        # Si no existe, marcar flag para sugerir creación.
        
        tiene_referencia_larga = bool(movimiento.referencia and len(movimiento.referencia.strip()) > 8 and movimiento.referencia.isdigit())
        match_referencia_encontrado = False
        
        if tiene_referencia_larga and self.tercero_descripcion_repo:
            td = self.tercero_descripcion_repo.buscar_por_referencia(movimiento.referencia)
            if td:
                print(f"   ✅ MATCH REFERENCIA EXACTA (>8): {movimiento.referencia} -> TerceroID {td.terceroid}")
                # 1. Fijar el tercero inmediatamente
                sugerencia['tercero_id'] = td.terceroid
                sugerencia['razon'] = f"Referencia Exacta (>8 dígitos): {movimiento.referencia}"
                sugerencia['tipo_match'] = 'referencia_exacta'
                match_referencia_encontrado = True
                
                # 2. Forzar el contexto a ser SOLO de este tercero
                # Buscamos historial de este tercero para intentar deducir CC/Concepto por similitud de valor/texto
                cands_tercero, _ = self.movimiento_repo.buscar_avanzado(tercero_id=td.terceroid, limit=20)
                
                for m in cands_tercero:
                    if m.id != movimiento.id:
                        if m.id not in candidatos_map:
                            candidatos_map[m.id] = {'mov': m, 'origen': {'referencia_tercero'}, 'score_cobertura': 10}
                        else:
                             candidatos_map[m.id]['origen'].add('referencia_tercero')
                             candidatos_map[m.id]['score_cobertura'] += 10
            else:
                print(f"   ⚠️ Referencia larga {movimiento.referencia} NO encontrada en catálogo.")
                referencia_no_existe = True

        # ============================================
        # 1. ESTRATEGIA: PATRONES DE DESCRIPCIÓN (Catálogo Terceros)
        # ============================================
        # Nota: La Estrategia 1 original (Ref Exacta) ya se ejecutó en auto_clasificar (paso 1.2 y 1.3)
        # Aquí solo queda buscar patrones parciales si hay referencia.
        
        tiene_referencia = bool(movimiento.referencia and len(movimiento.referencia.strip()) > 0)
        
        if not match_referencia_encontrado and not sugerencia['tercero_id'] and tiene_referencia and self.tercero_descripcion_repo:
            descripcion = movimiento.descripcion or ""
            palabras_ignorar = {'y', 'de', 'la', 'el', 'en', 'a', 'por', 'para', 'con', 'cop', 'usd'}
            palabras = descripcion.split()
            # FIX: Permitimos palabras de 2 letras (ej: TC)
            significativas = [p for p in palabras if p.lower() not in palabras_ignorar and len(p) >= 2]
            
            patrones = []
            if len(significativas) >= 3: patrones.append(" ".join(significativas[:3]))
            if len(significativas) >= 2: patrones.append(" ".join(significativas[:2]))
            if significativas: patrones.append(significativas[0])
            
            for patron in patrones:
                if len(patron) < 3: continue
                matches = self.tercero_descripcion_repo.buscar_por_descripcion(patron)
                if matches:
                    mejor = matches[0]
                    # Si encontramos, lo usamos para sugerencia directa
                    if not sugerencia['tercero_id']:
                        sugerencia['tercero_id'] = mejor.terceroid
                        sugerencia['razon'] = f"Patrón Descripción: {mejor.descripcion}"
                        sugerencia['tipo_match'] = 'descripcion_tercero'
                        print(f"   ✅ Match directo por patrón: {mejor.descripcion}")
                    break

        # ============================================
        # 2. ESTRATEGIA: BÚSQUEDA EXHAUSTIVA (MULTI-WORD)
        # ============================================
        # Esta estrategia SIEMPRE corre para llenar el contexto
        
        descripcion = movimiento.descripcion or ""
        
        if not match_referencia_encontrado:
            palabras_ignorar = {'y', 'de', 'la', 'el', 'en', 'a', 'por', 'para', 'con', 'cop', 'usd', 'pago', 'transferencia'}
            palabras = descripcion.split()
            
            # FIX: Permitir palabras de 2 caracteres en búsqueda (e.g. 'TC')
            # Antes era len(p) > 2, ahora len(p) >= 2
            palabras_clave = sorted(list(set([p for p in palabras if p.lower() not in palabras_ignorar and len(p) >= 2])))
            
            print(f"   🔎 Buscando candidatos con palabras: {palabras_clave}")
            
            for palabra in palabras_clave:
                # Buscar en repo (Aumentado límite para evitar perder matches por palabras comunes como MASTER)
                # FIX: Limit aumentado de 30 a 100
                cands, _ = self.movimiento_repo.buscar_avanzado(descripcion_contiene=palabra, limit=100)
                
                for m in cands:
                    if m.id == movimiento.id or not m.tercero_id:
                        continue
                        
                    if m.id not in candidatos_map:
                        candidatos_map[m.id] = {'mov': m, 'origen': {'texto'}, 'score_cobertura': 0}
                    
                    if 'texto' not in candidatos_map[m.id]['origen']:
                        candidatos_map[m.id]['origen'].add('texto')
                    
                    candidatos_map[m.id]['score_cobertura'] += 1

        # ============================================
        # 3. CASOS ESPECIALES (FONDO RENTA / TRASLADO)
        # ============================================
        es_ahorros = movimiento.cuenta_id == 1
        es_fondo_renta = movimiento.cuenta_id == 3
        
        if es_fondo_renta:
             # Traer historial de la cuenta 3 (los ultimos 20)
             cands, _ = self.movimiento_repo.buscar_avanzado(cuenta_id=3, limit=20)
             for m in cands:
                if m.id != movimiento.id and m.tercero_id:
                    if m.id not in candidatos_map:
                        candidatos_map[m.id] = {'mov': m, 'origen': {'cuenta'}, 'score_cobertura': 0}
                    candidatos_map[m.id]['origen'].add('cuenta')
        
        # ============================================
        # 4. EVALUACIÓN Y RANKING UNIFICADO
        # ============================================
        resultados_scoring = []
        
        # Parámetros Scoring
        PESO_TEXTO = 0.7
        PESO_VALOR = 0.3
        
        # Margen valor
        margen_pct = Decimal(os.getenv('SIMILAR_RECORDS_VALUE_MARGIN_PERCENT', '20')) / Decimal('100')
        valor_abs = abs(movimiento.valor) if movimiento.valor else Decimal(0)
        valor_min = valor_abs * (1 - margen_pct)
        valor_max = valor_abs * (1 + margen_pct)
        
        for mid, data in candidatos_map.items():
            cand = data['mov']
            
            # 1. Similitud Texto (Híbrida)
            sim_texto = calcular_similitud_hibrida(descripcion, cand.descripcion or "")
            
            # 2. Similitud Valor
            score_valor = 0
            cand_valor_abs = abs(cand.valor) if cand.valor else Decimal(0)
            
            if cand.valor == movimiento.valor:
                score_valor = 100 # Match exacto
            elif (cand.valor is not None and movimiento.valor is not None 
                  and (cand.valor < 0) == (movimiento.valor < 0) # Mismo signo
                  and valor_min <= cand_valor_abs <= valor_max):
                score_valor = 50 # Rango aceptable
            
            # Bonus por cobertura de palabras (Search Density)
            # Si buscamos 5 palabras y el candidato tiene 4, es muy relevante
            bonus_cobertura = min(data['score_cobertura'] * 2, 10) # Max 10 pts extra
            
            # SCORE FINAL
            score_final = (sim_texto * PESO_TEXTO) + (score_valor * PESO_VALOR) + bonus_cobertura
            
            resultados_scoring.append({
                'movimiento': cand,
                'score_final': score_final,
                'sim_texto': sim_texto,
                'score_valor': score_valor,
                'origen': list(data['origen'])
            })
            
        # Ordenar por Score Final Descendente (Ranking Competitivo)
        resultados_scoring.sort(key=lambda x: x['score_final'], reverse=True)
        
        # Logging Top 5
        print(f"\n   🏆 TOP 5 CANDIDATOS (Ranking Unificado):")
        for i, res in enumerate(resultados_scoring[:5]):
            m = res['movimiento']
            print(f"      {i+1}. [{res['score_final']:.1f} pts] ID {m.id} - '{m.descripcion}'")
            print(f"         Txt: {res['sim_texto']:.1f}% | Val: {res['score_valor']} | Origen: {res['origen']}")
            
        # Seleccionar contexto top 5
        contexto_movimientos = [r['movimiento'] for r in resultados_scoring[:5]]
        
        # ============================================
        # 5. INFERIR SUGERENCIAS DESDE EL GANADOR
        # ============================================
        if not sugerencia['tercero_id'] and contexto_movimientos:
            ganador = resultados_scoring[0]
            
            # Umbral de confianza
            if ganador['score_final'] >= 50:
                mejor_match = ganador['movimiento']
                sugerencia['tercero_id'] = mejor_match.tercero_id
                
                # Si tambien coincide en valor (o es muy similar), sugerir clasificacion completa
                if ganador['score_valor'] >= 50:
                    sugerencia['centro_costo_id'] = mejor_match.centro_costo_id
                    sugerencia['concepto_id'] = mejor_match.concepto_id
                    sugerencia['razon'] = f"Similaridad Histórica: {ganador['sim_texto']:.1f}% (Valor coincidente)"
                    sugerencia['tipo_match'] = 'historico_valor'
                else:
                    sugerencia['razon'] = f"Similaridad Texto: {ganador['sim_texto']:.1f}%"
                    sugerencia['tipo_match'] = 'historico_texto'
        
        # ============================================
        # 6. SUGERIR TERCERO SI TODOS SON IGUALES (Consistencia)
        # ============================================
        if not sugerencia['tercero_id'] and contexto_movimientos:
            terceros_unicos = set(m.tercero_id for m in contexto_movimientos if m.tercero_id)
            if len(terceros_unicos) == 1:
                tercero_comun_id = terceros_unicos.pop()
                sugerencia['tercero_id'] = tercero_comun_id
                sugerencia['razon'] = f"Historial consistente ({len(contexto_movimientos)}/{len(contexto_movimientos)})"
                sugerencia['tipo_match'] = 'frecuencia_tercero'
                
        # Completar información de nombres para el frontend
        if sugerencia['tercero_id']:
            t = self.tercero_repo.obtener_por_id(sugerencia['tercero_id'])
            sugerencia['tercero_nombre'] = t.tercero if t else None
            
        return {
            'movimiento_id': movimiento.id,
            'sugerencia': sugerencia,
            'contexto': contexto_movimientos,
            'referencia_no_existe': referencia_no_existe,
            'referencia': movimiento.referencia if referencia_no_existe else None
        }

    def aplicar_regla_lote(self, patron: str, tercero_id: int, centro_costo_id: int, concepto_id: int) -> int:
        """
        Aplica una clasificación a todos los movimientos pendientes que coinciden con un patrón.
        """
        # Delegar al repositorio para eficiencia (UPDATE masivo)
        return self.movimiento_repo.actualizar_clasificacion_lote(patron, tercero_id, centro_costo_id, concepto_id)

    def obtener_movimientos_similares_pendientes(self, movimiento_id: int) -> List[dict]:
        """
        Encuentra todos los movimientos PENDIENTES similares a un movimiento dado.
        Usa el mismo algoritmo de similitud de texto del fallback.
        Retorna lista con movimientos y su porcentaje de similitud.
        """
        # Obtener el movimiento de referencia
        movimiento = self.movimiento_repo.obtener_por_id(movimiento_id)
        if not movimiento:
            raise ValueError(f"Movimiento {movimiento_id} no encontrado")
        
        # Extraer múltiples palabras significativas (mismo algoritmo mejorado que fallback)
        descripcion = movimiento.descripcion or ""
        palabras_ignorar = {'y', 'de', 'la', 'el', 'en', 'a', 'por', 'para', 'con', 'cop', 'usd'}
        palabras = descripcion.split()
        
        # FIX: Permitir palabras de >= 2 letras
        palabras_significativas = [p for p in palabras if p.lower() not in palabras_ignorar and len(p) >= 2]
        
        # Obtener todas las palabras significativas sin límite
        palabras_busqueda = palabras_significativas
        
        if not palabras_busqueda:
            return []
        
        # Buscar movimientos que contengan al menos una de las palabras clave
        candidatos_map = {}  # {id: {'mov': mov, 'score': int}}
        
        for palabra in palabras_busqueda:
            if len(palabra) >= 2: # FIX: Ajustar validación para permitir 2 letras
                movs_palabra, _ = self.movimiento_repo.buscar_avanzado(
                    descripcion_contiene=palabra,
                    solo_pendientes=True,  # Solo pendientes
                    limit=50
                )
                # Agregar y contar coincidencias (score de cobertura)
                for m in movs_palabra:
                    if m.id not in candidatos_map:
                        candidatos_map[m.id] = {'mov': m, 'score': 0}
                    candidatos_map[m.id]['score'] += 1
        
        # Convertir a lista y ordenar por score de cobertura (ranking)
        candidates_ranked = sorted(
            candidatos_map.values(), 
            key=lambda x: x['score'], 
            reverse=True
        )
        
        # Quedarnos con los top 100 candidatos por cobertura
        movs_similares = [c['mov'] for c in candidates_ranked[:100]]
        
        # Obtener umbral de similitud desde variable de entorno
        umbral_similitud = float(os.getenv('SIMILAR_RECORDS_TEXT_SIMILARITY_THRESHOLD', '70'))
        descripcion_actual = movimiento.descripcion or ""

        
        # Calcular similitud híbrida para cada candidato
        candidatos_similitud = []
        for m in movs_similares:
            if m.id != movimiento.id:  # Excluir el movimiento de referencia
                # Usar similitud híbrida (60% palabras + 40% secuencia)
                similitud = calcular_similitud_hibrida(descripcion_actual, m.descripcion or "")
                if similitud >= umbral_similitud:
                    candidatos_similitud.append({
                        'movimiento': m,
                        'similitud': round(similitud, 1)
                    })
        
        # Ordenar por similitud descendente
        candidatos_similitud.sort(key=lambda x: x['similitud'], reverse=True)
        
        return candidatos_similitud
