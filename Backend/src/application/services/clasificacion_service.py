from typing import List, Optional, Tuple
from decimal import Decimal
from src.domain.models.movimiento import Movimiento
from src.domain.ports.movimiento_repository import MovimientoRepository
from src.domain.ports.reglas_repository import ReglasRepository
from src.domain.ports.tercero_repository import TerceroRepository
from src.domain.ports.tercero_descripcion_repository import TerceroDescripcionRepository
from src.domain.ports.grupo_repository import GrupoRepository
from src.domain.ports.concepto_repository import ConceptoRepository

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
                 grupo_repo: GrupoRepository = None):
        self.movimiento_repo = movimiento_repo
        self.reglas_repo = reglas_repo
        self.tercero_repo = tercero_repo
        self.tercero_descripcion_repo = tercero_descripcion_repo
        self.concepto_repo = concepto_repo
        self.grupo_repo = grupo_repo

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
        reglas = self.reglas_repo.obtener_todos()
        for regla in reglas:
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
                    modificado = True
                if regla.grupo_id and not movimiento.grupo_id:
                    movimiento.grupo_id = regla.grupo_id
                    modificado = True
                if regla.concepto_id and not movimiento.concepto_id:
                    movimiento.concepto_id = regla.concepto_id
                    modificado = True
                
                if modificado:
                    return True, f"Regla estática: '{regla.patron}'"

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
                movimiento.grupo_id = mejor_candidato.grupo_id
                movimiento.concepto_id = mejor_candidato.concepto_id
                return True, f"Histórico por Referencia ({movimiento.referencia})"

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
        Calcula una sugerencia de clasificación para un movimiento,
        sin guardarla. Retorna también el contexto histórico relevante.
        
        Algoritmo de búsqueda:
        1. Si referencia tiene >8 dígitos numéricos, buscar en tercero_descripciones.referencia
        2. Buscar descripción en tercero_descripciones.descripcion
        3. Mostrar historial de movimientos con misma referencia o descripción similar
        """
        movimiento = self.movimiento_repo.obtener_por_id(movimiento_id)
        if not movimiento:
            raise ValueError(f"Movimiento {movimiento_id} no encontrado")
            
        sugerencia = {
            'tercero_id': None, 
            'grupo_id': None, 
            'concepto_id': None,
            'razon': None,
            'tipo_match': None
        }
        
        # Contexto de movimientos históricos
        contexto_movimientos = []
        
        # Flag para indicar que tiene referencia larga pero no existe en alias
        referencia_no_existe = False
        
        # ============================================
        # CASO ESPECIAL: FONDO RENTA (cuenta_id=3)
        # ============================================
        if movimiento.cuenta_id == 3:
            tercero_fr = self.tercero_repo.buscar_exacto("Fondo Renta")
            if tercero_fr:
                sugerencia['tercero_id'] = tercero_fr.terceroid
                sugerencia['razon'] = "Cuenta Fondo Renta → Tercero Fondo Renta"
                sugerencia['tipo_match'] = 'cuenta_fondo_renta'
                
                # Para valores pequeños, auto-asignar Impuestos/Rte Fuente
                if (movimiento.valor is not None and abs(movimiento.valor) < 100000 
                    and self.grupo_repo and self.concepto_repo):
                    
                    # Buscar grupo Impuestos
                    grupo_imp = self.grupo_repo.buscar_por_nombre("Impuestos")
                    if grupo_imp:
                        # Buscar concepto Rte Fuente dentro de ese grupo
                        concepto_rf = self.concepto_repo.buscar_por_nombre("Rte Fuente", grupoid=grupo_imp.grupoid)
                        if concepto_rf:
                            sugerencia['grupo_id'] = grupo_imp.grupoid
                            sugerencia['concepto_id'] = concepto_rf.conceptoid
                            sugerencia['razon'] = "Fondo Renta (valor < $100.000) → Impuestos / Rte Fuente"
        
        # ============================================
        # 1. BUSCAR POR REFERENCIA (>8 dígitos) en tercero_descripciones
        # ============================================
        has_long_ref = (movimiento.referencia 
                        and len(movimiento.referencia) > 8 
                        and movimiento.referencia.isdigit())
        
        if has_long_ref and self.tercero_descripcion_repo:
            td = self.tercero_descripcion_repo.buscar_por_referencia(movimiento.referencia)
            if td:
                # Obtener el nombre del tercero
                tercero = self.tercero_repo.obtener_por_id(td.terceroid)
                tercero_nombre = tercero.tercero if tercero else "Desconocido"
                sugerencia.update({
                    'tercero_id': td.terceroid,
                    'razon': f"Referencia: {movimiento.referencia} → {tercero_nombre}",
                    'tipo_match': 'referencia_tercero'
                })
            else:
                # La referencia tiene >8 dígitos pero NO existe en tercero_descripciones
                referencia_no_existe = True
        
        # ============================================
        # 2. BUSCAR POR DESCRIPCIÓN en tercero_descripciones
        # ============================================
        if not sugerencia['tercero_id'] and self.tercero_descripcion_repo:
            descripcion = movimiento.descripcion or ""
            
            # Extraer las primeras palabras significativas para buscar
            # Ignorar palabras cortas como "Y", "De", "La", etc.
            palabras_ignorar = {'y', 'de', 'la', 'el', 'en', 'a', 'por', 'para', 'con', 'cop', 'usd'}
            palabras = descripcion.split()
            palabras_significativas = [p for p in palabras if p.lower() not in palabras_ignorar and len(p) > 1]
            
            patrones_a_probar = []
            
            # Probar con las primeras 2-3 palabras significativas
            if len(palabras_significativas) >= 3:
                patrones_a_probar.append(" ".join(palabras_significativas[:3]))
            if len(palabras_significativas) >= 2:
                patrones_a_probar.append(" ".join(palabras_significativas[:2]))
            if palabras_significativas:
                patrones_a_probar.append(palabras_significativas[0])
            
            # Try each pattern until we find a match
            for patron in patrones_a_probar:
                if len(patron) < 3:  # Skip very short patterns
                    continue
                matches = self.tercero_descripcion_repo.buscar_por_descripcion(patron)
                if matches:
                    mejor = matches[0]
                    tercero = self.tercero_repo.obtener_por_id(mejor.terceroid)
                    tercero_nombre = tercero.tercero if tercero else "Desconocido"
                    sugerencia.update({
                        'tercero_id': mejor.terceroid,
                        'razon': f"Descripción: {mejor.descripcion} → {tercero_nombre}",
                        'tipo_match': 'descripcion_tercero'
                    })
                    break  # Found a match, stop trying
        
        # ============================================
        # 3. CONTEXTO HISTÓRICO
        # ============================================
        # Caso especial: Fondo Renta (cuenta_id=3) - siempre mostrar últimos 5 movimientos clasificados
        es_fondo_renta = movimiento.cuenta_id == 3
        
        if es_fondo_renta:
            # Para Fondo Renta: obtener últimos movimientos de esta cuenta que ya estén clasificados
            movs_cuenta, _ = self.movimiento_repo.buscar_avanzado(
                cuenta_id=3,
                limit=50
            )
            contexto_movimientos = [
                m for m in movs_cuenta 
                if m.id != movimiento.id 
                and m.tercero_id is not None
                and m.grupo_id is not None
                and m.concepto_id is not None
            ]
        elif sugerencia['tercero_id'] and not referencia_no_existe:
            # Caso normal: mostrar historial del tercero sugerido
            movs_tercero, _ = self.movimiento_repo.buscar_avanzado(
                tercero_id=sugerencia['tercero_id'],
                limit=50  # Increased to have more candidates for value matching
            )
            # Filter: exclude current movement, require at least tercero_id set
            # (grupo_id and concepto_id can be used as copy source by user)
            contexto_movimientos = [
                m for m in movs_tercero 
                if m.id != movimiento.id 
                and m.tercero_id is not None
            ]
            
            # ============================================
            # 4. SUGERIR GRUPO Y CONCEPTO POR COINCIDENCIA DE VALOR
            # ============================================
            # Si encontramos un movimiento histórico con el mismo valor exacto,
            # usar su grupo_id y concepto_id como sugerencia
            if movimiento.valor is not None:
                for m in contexto_movimientos:
                    if (m.valor == movimiento.valor 
                        and m.grupo_id is not None 
                        and m.concepto_id is not None):
                        sugerencia['grupo_id'] = m.grupo_id
                        sugerencia['concepto_id'] = m.concepto_id
                        # Actualizar la razón para indicar que también coincidió por valor
                        razon_actual = sugerencia.get('razon') or ''
                        sugerencia['razon'] = f"{razon_actual} (Valor coincidente: {m.valor})"
                        break  # Usar el primero que coincida (más reciente)
            
            # ============================================
            # 5. FILTRAR HISTORIAL POR VALORES CERCANOS
            # ============================================
            # Para cuenta 3 (Fondo Renta), no aplicar filtro por porcentaje
            # Solo mostrar los últimos 5 movimientos de la cuenta
            if not es_fondo_renta:
                # Solo mostrar movimientos con valores cercanos al actual (±5%)
                if movimiento.valor is not None and movimiento.valor != 0:
                    valor_actual = abs(movimiento.valor)
                    margen = valor_actual * Decimal('0.05')  # 5% de margen
                    valor_min = valor_actual - margen
                    valor_max = valor_actual + margen
                    
                    # Filtrar por signo igual y valor dentro del rango
                    contexto_filtrado = [
                        m for m in contexto_movimientos
                        if m.valor is not None
                        and (m.valor < 0) == (movimiento.valor < 0)  # Mismo signo
                        and valor_min <= abs(m.valor) <= valor_max
                    ]
                    
                    # Si hay resultados filtrados, usarlos; sino mantener los originales
                    if contexto_filtrado:
                        contexto_movimientos = contexto_filtrado
        
        # Ordenar por fecha descendente
        contexto_movimientos.sort(key=lambda x: x.fecha, reverse=True)
        contexto_movimientos = contexto_movimientos[:5]

        return {
            'movimiento_id': movimiento.id,
            'sugerencia': sugerencia,
            'contexto': contexto_movimientos,
            'referencia_no_existe': referencia_no_existe,
            'referencia': movimiento.referencia if referencia_no_existe else None
        }

    def aplicar_regla_lote(self, patron: str, tercero_id: int, grupo_id: int, concepto_id: int) -> int:
        """
        Aplica una clasificación a todos los movimientos pendientes que coinciden con un patrón.
        """
        # Delegar al repositorio para eficiencia (UPDATE masivo)
        return self.movimiento_repo.actualizar_clasificacion_lote(patron, tercero_id, grupo_id, concepto_id)
