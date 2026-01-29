from datetime import date, datetime
import calendar
from decimal import Decimal
from typing import List, Dict, Any, Optional
from src.domain.models.conciliacion import Conciliacion
from src.domain.models.movimiento_extracto import MovimientoExtracto
from src.domain.ports.conciliacion_repository import ConciliacionRepository
from src.domain.ports.movimiento_extracto_repository import MovimientoExtractoRepository
from src.domain.ports.cuenta_extractor_repository import CuentaExtractorRepository
from src.infrastructure.logging.config import logger
import importlib
from src.infrastructure.extractors.utils import extraer_periodo_de_nombre_archivo, obtener_nombre_mes, extraer_periodo_de_movimientos

class CargarExtractoBancarioService:
    """
    Servicio especializado en la carga y validación de Extractos Bancarios Mensuales (PDFs).
    Misión: Garantizar que la información cargada coincida contablemente con el banco.
    """
    def __init__(self, 
                 conciliacion_repo: ConciliacionRepository,
                 movimiento_extracto_repo: MovimientoExtractoRepository,
                 cuenta_extractor_repo: Optional[CuentaExtractorRepository] = None):
        self.conciliacion_repo = conciliacion_repo
        self.movimiento_extracto_repo = movimiento_extracto_repo
        self.cuenta_extractor_repo = cuenta_extractor_repo

    def _extraer_periodo_nombre_archivo(self, filename: str) -> Optional[tuple[int, int]]:
        """Extrae año y mes del nombre del archivo (ej: 2025-01 o 202501)."""
        return extraer_periodo_de_nombre_archivo(filename)

    def _obtener_modulos_extractor_movimientos(self, cuenta_id: int) -> List[Any]:
        """Retorna LISTA de módulos extractores de movimientos configurados."""
        modulos_names = []
        if self.cuenta_extractor_repo and cuenta_id:
            db_modulos = self.cuenta_extractor_repo.obtener_modulos(cuenta_id, 'MOVIMIENTOS')
            if db_modulos:
                modulos_names = db_modulos

        if not modulos_names:
            EXTRACTORES_MOVIMIENTOS = {
                1: ['ahorros_movimientos'],
                3: ['fondorenta_movimientos'],
                6: ['mastercard_pesos_extracto_movimientos', 'mastercard_pesos_extracto_anterior_movimientos'],
                7: ['mastercard_usd_extracto_movimientos', 'mastercard_usd_extracto_anterior_movimientos']
            }
            modulos_names = EXTRACTORES_MOVIMIENTOS.get(cuenta_id, [])

        loaded_modules = []
        for nombre in modulos_names:
            try:
                module = importlib.import_module(f"src.infrastructure.extractors.bancolombia.{nombre}")
                loaded_modules.append(module)
            except Exception as e:
                logger.error(f"Error importando extractor {nombre}: {e}")
        return loaded_modules

    def analizar_extracto(self, file_obj: Any, filename: str, tipo_cuenta: str, cuenta_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Analiza un PDF y extrae el resumen (Saldos) y movimientos para validación cruzada.
        FIX: Usa lógica de signos para sumatorias (Positivo=Entrada, Negativo=Salida).
        """
        datos = {}
        
        # 1. Extraer Resumen (Encabezado del PDF)
        # -------------------------------------------------------------------------
        # Intenta usar la configuración de DB para el extractor de RESUMEN
        extracted_summary = False
        if cuenta_id and self.cuenta_extractor_repo:
            modulos = self.cuenta_extractor_repo.obtener_modulos(cuenta_id, 'RESUMEN')
            for nombre_modulo in modulos:
                try:
                    if hasattr(file_obj, 'seek'): file_obj.seek(0)
                    module = importlib.import_module(f"src.infrastructure.extractors.bancolombia.{nombre_modulo}")
                    datos = module.extraer_resumen(file_obj)
                    if datos:
                        extracted_summary = True
                        break
                except Exception as e:
                    logger.warning(f"Extractor Resumen {nombre_modulo} falló: {e}")
                    continue
        
        # Fallback Hardcoded si no se obtuvo resumen por DB
        if not extracted_summary:
            if hasattr(file_obj, 'seek'): file_obj.seek(0)
            if tipo_cuenta == 'Ahorros':
                from src.infrastructure.extractors.bancolombia import ahorros_extracto
                datos = ahorros_extracto.extraer_resumen(file_obj)
            elif tipo_cuenta == 'FondoRenta':
                from src.infrastructure.extractors.bancolombia import fondorenta_extracto
                datos = fondorenta_extracto.extraer_resumen(file_obj)
            elif tipo_cuenta == 'MasterCardPesos':
                 periodo = self._extraer_periodo_nombre_archivo(filename)
                 usar_anterior = (periodo and (periodo[0] < 2025 or (periodo[0] == 2025 and periodo[1] <= 8)))
                 if usar_anterior:
                     from src.infrastructure.extractors.bancolombia import mastercard_pesos_extracto_anterior
                     datos = mastercard_pesos_extracto_anterior.extraer_resumen(file_obj)
                 else:
                     from src.infrastructure.extractors.bancolombia import mastercard_pesos_extracto
                     datos = mastercard_pesos_extracto.extraer_resumen(file_obj)
            elif tipo_cuenta == 'MasterCardUSD':
                 from src.infrastructure.extractors.bancolombia import mastercard_usd_extracto
                 datos = mastercard_usd_extracto.extraer_resumen(file_obj)

        if not datos:
            raise ValueError("No se pudo extraer el resumen del archivo. Verifique el formato.")

        # 2. Contar Movimientos y Validación Cruzada
        # -------------------------------------------------------------------------
        if cuenta_id:
            try:
                extractores = self._obtener_modulos_extractor_movimientos(cuenta_id)
                movs = []
                for extractor_module in extractores:
                    try:
                        if hasattr(file_obj, 'seek'): file_obj.seek(0)
                        movs_temp = extractor_module.extraer_movimientos(file_obj)
                        if movs_temp:
                            movs = movs_temp
                            datos['movimientos'] = movs
                            break
                    except Exception as inner_e:
                        continue
                
                # Inyectar movimiento sintético de Rendimientos para Fondo Renta (si aplica)
                if tipo_cuenta == 'FondoRenta' and datos.get('rendimientos') and datos.get('year') and datos.get('month'):
                    try:
                        rend_val = Decimal(str(datos['rendimientos']))
                        if rend_val > 0:
                            # Calcular último día del mes
                            last_day = calendar.monthrange(datos['year'], datos['month'])[1]
                            fecha_rend = date(datos['year'], datos['month'], last_day)
                            
                            # Crear movimiento sintético
                            mov_rend = {
                                'fecha': fecha_rend,
                                'descripcion': 'RENDIMIENTOS',
                                'referencia': 'AUTOMATICO',
                                'valor': rend_val,
                                'usd': None,
                                'moneda': 'COP',
                                'numero_linea': 999999, # Ficticio
                                'raw_text': f"{datos['year']}{datos['month']:02d}{last_day} RENDIMIENTOS {rend_val}",
                                'es_duplicado': False # Se validará check en repo
                            }
                            # Agregarlo a la lista de movimientos para que sume y se guarde
                            movs.append(mov_rend)
                    except Exception as e:
                        logger.warning(f"No se pudo inyectar rendimiento sintético: {e}")

                # Acumuladores basados puramente en SIGNOS
                total_mov_entradas = Decimal(0)
                total_mov_salidas = Decimal(0)
                # Mantenemos estos en 0 para no romper estructura de retorno, pero no se calculan por keywords
                total_mov_rendimientos = Decimal(0)
                total_mov_retenciones = Decimal(0)
                
                total_duplicados = 0
                total_nuevos = 0 # En este contexto, 'nuevo' es que se leyó del archivo

                for raw in movs:
                    # Determinar valor numérico real
                    val = Decimal(0)
                    if raw.get('usd') is not None and raw.get('usd') != 0 and raw.get('moneda') == 'USD':
                         val = Decimal(str(raw['usd']))
                    else:
                         val = Decimal(str(raw['valor']))

                    # --- LÓGICA DE CLASIFICACIÓN CORREGIDA ---
                    if tipo_cuenta == 'FondoRenta':
                        desc_up = raw.get('descripcion', '').upper()
                        # Lógica Específica Fondo Renta
                        if 'RETEFTE' in desc_up or 'RTEFTE' in desc_up:
                            total_mov_retenciones += abs(val)
                            # NO suma a salidas, es retención
                        elif 'RENDIMIENTOS' in desc_up:
                            total_mov_rendimientos += val
                            # NO suma a entradas, es rendimiento
                        else:
                            # Fallback standard
                            if val > 0:
                                total_mov_entradas += val
                            else:
                                total_mov_salidas += abs(val)
                    else:
                        # Lógica Standard (Signos)
                        if val > 0:
                            total_mov_entradas += val
                        else:
                            total_mov_salidas += abs(val)

                    # Simulación de duplicados (simple para conteo)
                    if self.movimiento_extracto_repo:
                        # Verificar si ya existe en extractos previos
                         usd_val = raw['valor'] if raw.get('moneda') == 'USD' else None
                         check_val = 0 if raw.get('moneda') == 'USD' else raw['valor']
                         
                         existe = self.movimiento_extracto_repo.existe_movimiento(
                            fecha=raw['fecha'], valor=check_val, referencia=raw.get('referencia', ''),
                            cuenta_id=cuenta_id, descripcion=raw.get('descripcion', ''), usd=usd_val
                         )
                         if existe: 
                             total_duplicados += 1
                             raw['es_duplicado'] = True
                         else: 
                             total_nuevos += 1
                             raw['es_duplicado'] = False

                datos['movimientos_count'] = len(movs)
                datos['total_leidos'] = len(movs)
                datos['total_duplicados'] = total_duplicados
                datos['total_nuevos'] = total_nuevos
                
                datos['movimientos_entradas'] = total_mov_entradas
                datos['movimientos_salidas'] = total_mov_salidas
                datos['movimientos_rendimientos'] = total_mov_rendimientos
                datos['movimientos_retenciones'] = total_mov_retenciones
                
                # Validación Cruzada
                header_entradas = datos.get('entradas', Decimal(0))
                header_salidas = datos.get('salidas', Decimal(0))
                header_rendimientos = datos.get('rendimientos', Decimal(0))
                header_retenciones = datos.get('retenciones', Decimal(0))
                
                # Diferencias
                diff_entradas = header_entradas - total_mov_entradas
                diff_salidas = header_salidas - total_mov_salidas
                
                # Para Fondo Renta validamos también rendimientos y retenciones si existen headers
                diff_rend = Decimal(0)
                diff_ret = Decimal(0)
                
                if tipo_cuenta == 'FondoRenta':
                    diff_rend = header_rendimientos - total_mov_rendimientos
                    diff_ret = header_retenciones - total_mov_retenciones
                
                TOLERANCIA = Decimal('0.50')
                es_valido = (abs(diff_entradas) <= TOLERANCIA) and (abs(diff_salidas) <= TOLERANCIA)
                
                if tipo_cuenta == 'FondoRenta':
                    es_valido = es_valido and (abs(diff_rend) <= TOLERANCIA) and (abs(diff_ret) <= TOLERANCIA)
                
                datos['validacion_cruzada'] = {
                    "es_valido": es_valido,
                    "diferencia_entradas": diff_entradas,
                    "diferencia_salidas": diff_salidas,
                    "diferencia_rendimientos": diff_rend,
                    "diferencia_retenciones": diff_ret,
                    "movimientos_entradas": total_mov_entradas,
                    "movimientos_salidas": total_mov_salidas,
                    "movimientos_rendimientos": total_mov_rendimientos,
                    "movimientos_retenciones": total_mov_retenciones
                }

            except Exception as e:
                logger.warning(f"Error contando movimientos en analisis de extracto: {e}")
                datos['movimientos_count'] = 0

        # 3. Datos Extra (Persistencia previa)
        if cuenta_id and self.conciliacion_repo and datos.get('year') and datos.get('month'):
            try:
                existente = self.conciliacion_repo.obtener_por_periodo(cuenta_id, datos['year'], datos['month'])
                if existente and existente.datos_extra:
                    if 'rendimientos' in existente.datos_extra and 'rendimientos' not in datos:
                        datos['rendimientos'] = Decimal(str(existente.datos_extra['rendimientos']))
                    if 'retenciones' in existente.datos_extra and 'retenciones' not in datos:
                        datos['retenciones'] = Decimal(str(existente.datos_extra['retenciones']))
            except Exception as e:
                pass

        return datos

    async def procesar_extracto(self, file_obj: Any, filename: str, tipo_cuenta: str, cuenta_id: int, year: Optional[int] = None, month: Optional[int] = None, overrides: Optional[Dict[str, Decimal]] = None, movimientos_confirmados: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        Procesa un extracto PDF y guarda resumen + movimientos.
        """
        import calendar
        
        # 1. Analizar para obtener datos base o usar confirmados
        if movimientos_confirmados:
             # Si vienen movimientos confirmados, confiamos en ellos
             resumen = { 'year': year, 'month': month } # Minimal context
             # Recalcular totales basados en confirmados
             total_entradas = sum(Decimal(str(m['valor'])) for m in movimientos_confirmados if Decimal(str(m['valor'])) > 0)
             total_salidas = sum(abs(Decimal(str(m['valor']))) for m in movimientos_confirmados if Decimal(str(m['valor'])) < 0)
             # Buscar resumen original para saldos (o overrides) -> Idealmente deberíamos re-leer headers si no viniera en overrides
             # Por simplicidad asumimos que el frontend manda overrides o re-analizamos:
             try:
                 temp_analisis = self.analizar_extracto(file_obj, filename, tipo_cuenta, cuenta_id)
                 resumen.update(temp_analisis) # Rellenar saldo_anterior, etc
             except:
                 pass
             
             resumen['entradas'] = total_entradas
             resumen['salidas'] = total_salidas
             movimientos_data = movimientos_confirmados
        else:
             resumen = self.analizar_extracto(file_obj, filename, tipo_cuenta, cuenta_id)
             movimientos_data = resumen.get('movimientos', [])

        # Overrides
        if overrides:
            if 'saldo_anterior' in overrides: resumen['saldo_anterior'] = overrides['saldo_anterior']
            if 'saldo_final' in overrides: resumen['saldo_final'] = overrides['saldo_final']
            if 'entradas' in overrides: resumen['entradas'] = overrides['entradas']
            if 'salidas' in overrides: resumen['salidas'] = overrides['salidas']

        # Validar periodo
        if not year or not month:
            year = resumen.get('year')
            month = resumen.get('month')
            if not year or not month:
                raise ValueError("No se pudo determinar el periodo del extracto.")

        # 2. Guardar Conciliación
        last_day = calendar.monthrange(year, month)[1]
        fecha_corte = date(year, month, last_day)
        
        val_saldo_anterior = Decimal(str(resumen.get('saldo_anterior', 0)))
        val_entradas = Decimal(str(resumen.get('entradas', 0)))
        val_salidas = Decimal(str(resumen.get('salidas', 0)))
        val_saldo_final = Decimal(str(resumen.get('saldo_final', 0)))
        
        datos_extra = {}
        if filename: datos_extra['archivo_extracto'] = filename

        conciliacion_actual = self.conciliacion_repo.obtener_por_periodo(cuenta_id, year, month)
        
        if conciliacion_actual:
            conciliacion_actual.extracto_saldo_anterior = val_saldo_anterior
            conciliacion_actual.extracto_entradas = val_entradas
            conciliacion_actual.extracto_salidas = val_salidas
            conciliacion_actual.extracto_saldo_final = val_saldo_final
            conciliacion_actual.fecha_corte = fecha_corte
            if not conciliacion_actual.datos_extra: conciliacion_actual.datos_extra = {}
            conciliacion_actual.datos_extra.update(datos_extra)
            conciliacion_to_save = conciliacion_actual
        else:
            conciliacion_to_save = Conciliacion(
                id=None, cuenta_id=cuenta_id, year=year, month=month, fecha_corte=fecha_corte,
                extracto_saldo_anterior=val_saldo_anterior, extracto_entradas=val_entradas,
                extracto_salidas=val_salidas, extracto_saldo_final=val_saldo_final,
                sistema_entradas=Decimal(0), sistema_salidas=Decimal(0), sistema_saldo_final=Decimal(0),
                diferencia_saldo=None, datos_extra=datos_extra, estado='PENDIENTE'
            )
            
        guardado = self.conciliacion_repo.guardar(conciliacion_to_save)

        # 3. Guardar Movimientos Extracto
        movimientos_extracto_objs = []
        for mov_data in movimientos_data:
            f_mov = mov_data['fecha']
            if isinstance(f_mov, str):
                try: f_mov = datetime.strptime(f_mov, "%Y-%m-%d").date()
                except: pass
            
            movimientos_extracto_objs.append(MovimientoExtracto(
                id=None, cuenta_id=cuenta_id, year=year, month=month, fecha=f_mov,
                descripcion=mov_data['descripcion'], referencia=mov_data.get('referencia'),
                valor=Decimal(str(mov_data['valor'])),
                usd=Decimal(str(mov_data['usd'])) if mov_data.get('usd') else None,
                trm=Decimal(str(mov_data['trm'])) if mov_data.get('trm') else None,
                numero_linea=mov_data.get('numero_linea'),
                raw_text=mov_data.get('raw_text')
            ))
            
        if self.movimiento_extracto_repo:
            self.movimiento_extracto_repo.eliminar_por_periodo(cuenta_id, year, month)
            self.movimiento_extracto_repo.guardar_lote(movimientos_extracto_objs)
            
        return {
            "id_conciliacion": guardado.id, 
            "nuevos": len(movimientos_extracto_objs),
            "periodo": f"{year}-{obtener_nombre_mes(month)}"
        }
