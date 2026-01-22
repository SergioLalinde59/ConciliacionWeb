from datetime import date
from decimal import Decimal
from typing import List, Dict, Any, Optional
from src.domain.models.movimiento import Movimiento
from src.domain.models.movimiento_extracto import MovimientoExtracto
from src.domain.ports.movimiento_repository import MovimientoRepository
from src.domain.ports.movimiento_extracto_repository import MovimientoExtractoRepository
from src.domain.ports.moneda_repository import MonedaRepository
from src.domain.ports.tercero_repository import TerceroRepository
from src.domain.ports.conciliacion_repository import ConciliacionRepository
from src.domain.ports.cuenta_extractor_repository import CuentaExtractorRepository
from src.domain.models.conciliacion import Conciliacion
import importlib

# Importamos las implementaciones de extractores desde el módulo centralizado

from src.infrastructure.logging.config import logger

class ProcesadorArchivosService:
    def __init__(self, 
                 movimiento_repo: MovimientoRepository, 
                 moneda_repo: MonedaRepository,
                 tercero_repo: TerceroRepository,
                 conciliacion_repo: Optional[ConciliacionRepository] = None,
                 movimiento_extracto_repo: Optional[MovimientoExtractoRepository] = None,
                 cuenta_extractor_repo: Optional[CuentaExtractorRepository] = None):
        self.movimiento_repo = movimiento_repo
        self.moneda_repo = moneda_repo
        self.tercero_repo = tercero_repo
        self.conciliacion_repo = conciliacion_repo
        self.movimiento_extracto_repo = movimiento_extracto_repo
        self.cuenta_extractor_repo = cuenta_extractor_repo
        
        # Cache de monedas para evitar consultas repetitivas
        self._monedas_cache = {}

    def _obtener_id_moneda(self, codigo_iso: str) -> int:
        """Resuelve el ID de moneda. Default: 1 (COP) si no encuentra o no viene."""
        if not codigo_iso or codigo_iso == 'COP':
            return 1 # Asumimos 1 es COP
        
        # Check cache
        if codigo_iso in self._monedas_cache:
            return self._monedas_cache[codigo_iso]
        
        # Buscar en DB (usamos obtener_todos por simplicidad)
        # TODO: Implementar buscar_por_codigo en repo para ser más eficiente
        todas = self.moneda_repo.obtener_todos()
        for m in todas:
            self._monedas_cache[m.isocode] = m.monedaid
            if m.isocode == codigo_iso:
                return m.monedaid
        
        return 1 # Default COP

    def procesar_archivo(self, file_obj: Any, filename: str, tipo_cuenta: str, cuenta_id: int) -> Dict[str, Any]:
        """
        Procesa un archivo subido y extrae movimientos.
        
        Args:
            file_obj: El archivo (spooled file o bytes)
            filename: Nombre del archivo original
            tipo_cuenta: 'Ahorros', 'FondoRenta', 'MasterCardPesos', 'MasterCardUSD'
            cuenta_id: ID de la cuenta a la que asociar los movimientos
            
        Returns:
            Resumen del proceso (insertados, duplicados, errores)
        """
        
    def _extraer_movimientos(self, file_obj: Any, tipo_cuenta: str, cuenta_id: int = None) -> List[Dict[str, Any]]:
        # TODO: Refactorizar esto también para usar DB si es posible, pero por ahora se usa
        # principalmente para la deteccion de duplicados preliminar antes de guardar (analizar_archivo).
        # Sin embargo, analizar_archivo NO recibe cuenta_id obligatorio en el endpoint actual para analisis generico...
        # Pero si queremos soportar versiones, necesitamos cuenta_id.
        
        # Estrategia hibrida temporal con soporte de múltiples versiones:
        # 1. Obtener lista de extractores (ya sea de DB o Hardcoded)
        modulos = self._obtener_modulos_extractor_movimientos(cuenta_id)
        
        # 2. Iterar hasta encontrar movimientos
        if modulos:
            for module in modulos:
                try:
                    if hasattr(file_obj, 'seek'): file_obj.seek(0)
                    raw_movs = module.extraer_movimientos(file_obj)
                    if raw_movs:
                        # Normalizar descripción
                        for m in raw_movs:
                            if m.get('descripcion'):
                                m['descripcion'] = m['descripcion'].strip().title()
                        return raw_movs
                except Exception as e:
                    # Log instruction but continue with next extractor
                    print(f"DEBUG: Extractor fallo o no encontro movimientos: {e}")
                    continue

        # 3. Fallback legacy si no hay modulos definidos o fallaron todos
        # (Esto solo deberia pasar si cuenta_id es None o no está en la config)
        if True:
             if hasattr(file_obj, 'seek'):
                 file_obj.seek(0)
             
             raw_movs = []
             if tipo_cuenta == 'Ahorros':
                 from src.infrastructure.extractors.bancolombia import ahorros_movimientos
                 raw_movs = ahorros_movimientos.extraer_movimientos(file_obj)
             elif tipo_cuenta in ['MasterCardPesos', 'MasterCardUSD']:
                  from src.infrastructure.extractors.bancolombia import mastercard_movimientos
                  raw_movs = mastercard_movimientos.extraer_movimientos(file_obj)
             elif tipo_cuenta == 'FondoRenta':
                  from src.infrastructure.extractors.bancolombia import fondorenta_movimientos
                  raw_movs = fondorenta_movimientos.extraer_movimientos(file_obj)
             else:
                  return []

             # Normalizar descripción
             for m in raw_movs:
                 if m.get('descripcion'):
                     m['descripcion'] = m['descripcion'].strip().title()
             
             return raw_movs
        
        return []

    def analizar_archivo(self, file_obj: Any, filename: str, tipo_cuenta: str, cuenta_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Analiza el archivo sin guardar nada en BD.
        Retorna estadísticas y lista completa con marcado de duplicados.
        """
        raw_movs = self._extraer_movimientos(file_obj, tipo_cuenta, cuenta_id)
        
        resultado_detalle = []
        stats = {"leidos": len(raw_movs), "duplicados": 0, "nuevos": 0}
        
        for raw in raw_movs:
            try:
                # Determinar si es USD según lo que indica el PDF
                es_usd = raw.get('moneda') == 'USD'
                
                # MANEJO ESPECIAL PARA USD:
                # - El valor del PDF va al campo 'usd'
                # - El campo 'valor' queda en 0 (hasta que se aplique TRM)
                # - La moneda final siempre es COP
                if es_usd:
                    usd_val = raw['valor']  # El valor del PDF va a USD
                    valor_para_bd = 0       # Valor en COP = 0 hasta aplicar TRM
                    valor_para_check = 0    # Para detección de duplicados
                else:
                    usd_val = None
                    valor_para_bd = raw['valor']
                    valor_para_check = raw['valor']
                
                # Verificar duplicados
                # Para USD: buscamos por fecha + usd
                # Para COP: buscamos por fecha + valor + descripcion
                es_duplicado = self.movimiento_repo.existe_movimiento(
                    fecha=raw['fecha'],
                    valor=valor_para_check,
                    referencia=raw.get('referencia', ''),
                    descripcion=raw['descripcion'],
                    usd=usd_val
                )

                # LÓGICA ESPECIAL PARA TARJETA DE CRÉDITO (aplica a COP y USD):
                # Las descripciones pueden variar entre extractos, 
                # así que si no encontramos duplicado, buscamos solo por fecha y valor/usd
                
                if not es_duplicado and tipo_cuenta in ['MasterCardPesos', 'MasterCardUSD']:
                    posible_duplicado = self.movimiento_repo.existe_movimiento(
                        fecha=raw['fecha'],
                        valor=valor_para_check,
                        referencia=raw.get('referencia', ''),
                        descripcion='',  # Ignorar descripción
                        usd=usd_val
                    )
                    
                    if posible_duplicado:
                        moneda_txt = "USD" if es_usd else "COP"
                        valor_txt = usd_val if es_usd else valor_para_check
                        print(f"DEBUG: Duplicado TC detectado por fecha/{moneda_txt}: {raw['fecha']} - {valor_txt}")
                        es_duplicado = True
                    else:
                        print(f"DEBUG: NO se encontró duplicado por fecha/valor: {raw['fecha']} - {raw['valor']}")
                
                if es_duplicado:
                    stats["duplicados"] += 1
                else:
                    stats["nuevos"] += 1
                
                # Para la previsualización, mostramos el valor original y la moneda original
                # pero internamente sabemos que para USD: valor=0, usd=raw['valor'], moneda=COP
                resultado_detalle.append({
                    "fecha": raw['fecha'],
                    "descripcion": raw['descripcion'],
                    "referencia": raw.get('referencia', ''),
                    "valor": raw['valor'],  # Mostrar valor original en preview
                    "moneda": raw.get('moneda', 'COP'),  # Mostrar moneda original en preview
                    "es_duplicado": es_duplicado
                })
                
            except Exception as e:
                # Si falla algo en validación, lo marcamos como error pero seguimos
                print(f"Error analizando/validando {raw}: {e}")
                import traceback
                traceback.print_exc()
                # Añadimos el movimiento a la lista aunque haya fallado, para que aparezca en la preview
                resultado_detalle.append({
                    "fecha": raw.get('fecha', 'Error'),
                    "descripcion": raw.get('descripcion', 'Error en procesamiento'),
                    "referencia": raw.get('referencia', ''),
                    "valor": raw.get('valor', 0),
                    "moneda": raw.get('moneda', 'COP'),
                    "es_duplicado": False,
                    "error": str(e)
                })
                stats["nuevos"] += 1  # Contarlo como nuevo aunque tenga error
                
        # Ordenar: primero los nuevos (es_duplicado=False), luego por fecha DESC
        # Usamos sort estable en 2 pasos:
        # Paso 1: ordenar por fecha DESC
        resultado_detalle.sort(key=lambda x: x['fecha'] if x['fecha'] else '1900-01-01', reverse=True)
        # Paso 2: ordenar por estado (sort estable mantiene orden de fecha dentro de cada grupo)
        resultado_detalle.sort(key=lambda x: 0 if not x['es_duplicado'] else 1)
        
        return {
            "estadisticas": stats,
            "movimientos": resultado_detalle
        }

    def procesar_archivo(self, file_obj: Any, filename: str, tipo_cuenta: str, cuenta_id: int) -> Dict[str, Any]:
        """
        Procesa un archivo subido y GUARDA los movimientos NO duplicados.
        """
        # Reutilizamos la extracción, pero necesitamos iterar para guardar
        # Podríamos llamar a analizar_archivo primero, pero implica doble lectura si el stream se consume.
        # Asumimos que file_obj se puede leer una vez. Si es SpooledTemporaryFile, seek(0) funciona.
        
        # Para ser eficientes y consistentes, extraemos una vez.
        raw_movs = self._extraer_movimientos(file_obj, tipo_cuenta, cuenta_id)

        total = len(raw_movs)
        insertados = 0
        duplicados = 0
        errores = 0
        
        for raw in raw_movs:
            try:
                # Determinar si es USD según el PDF
                es_usd = raw.get('moneda') == 'USD'
                
                # MANEJO ESPECIAL PARA USD:
                # - El valor del PDF va al campo 'usd'
                # - El campo 'valor' queda en 0
                # - La moneda siempre es COP (id=1)
                if es_usd:
                    usd_val = raw['valor']
                    valor_para_bd = 0
                    valor_para_check = 0
                    moneda_id = 1  # Siempre COP
                else:
                    usd_val = None
                    valor_para_bd = raw['valor']
                    valor_para_check = raw['valor']
                    moneda_id = self._obtener_id_moneda(raw.get('moneda', 'COP'))
                
                # Verificar duplicados con la misma lógica que analizar_archivo
                existe = self.movimiento_repo.existe_movimiento(
                    fecha=raw['fecha'],
                    valor=valor_para_check,
                    referencia=raw.get('referencia', ''),
                    descripcion=raw['descripcion'],
                    usd=usd_val
                )
                
                # Lógica especial para TC: buscar solo por fecha y valor/usd
                if not existe and tipo_cuenta in ['MasterCardPesos', 'MasterCardUSD']:
                    existe = self.movimiento_repo.existe_movimiento(
                        fecha=raw['fecha'],
                        valor=valor_para_check,
                        referencia=raw.get('referencia', ''),
                        descripcion='',
                        usd=usd_val
                    )
                
                if existe:
                    duplicados += 1
                    continue
                
                # Crear Entidad con valores correctos para USD
                nuevo_mov = Movimiento(
                    fecha=raw['fecha'],
                    descripcion=raw['descripcion'],
                    referencia=raw.get('referencia', ''),
                    valor=valor_para_bd,  # 0 para USD, valor normal para COP
                    moneda_id=moneda_id,  # Siempre 1 (COP)
                    cuenta_id=cuenta_id,
                    usd=usd_val,  # Valor USD o None
                    trm=None,
                    tercero_id=None, centro_costo_id=None, concepto_id=None,
                    id=None  # Se genera al guardar
                )
                
                self.movimiento_repo.guardar(nuevo_mov)
                insertados += 1
                
            except Exception as e:
                print(f"Error procesando movimiento: {raw} - {e}")
                errores += 1
                
        # Calcular periodo dominante (YYYY-MMM)
        periodo_str = "N/A"
        if raw_movs:
            try:
                # Extraer (año, mes) de cada movimiento
                fechas = [m['fecha'][:7] for m in raw_movs if m.get('fecha')] # YYYY-MM
                if fechas:
                    from collections import Counter
                    most_common = Counter(fechas).most_common(1)[0][0]
                    year, month = most_common.split('-')
                    
                    meses_abr = {
                        '01': 'ENE', '02': 'FEB', '03': 'MAR', '04': 'ABR', '05': 'MAY', '06': 'JUN',
                        '07': 'JUL', '08': 'AGO', '09': 'SEP', '10': 'OCT', '11': 'NOV', '12': 'DIC'
                    }
                    periodo_str = f"{year}-{meses_abr.get(month, month)}"
            except Exception as e:
                print(f"Error calculando periodo: {e}")

        return {
            "archivo": filename,
            "total_extraidos": total,
            "nuevos_insertados": insertados,
            "duplicados": duplicados,
            "errores": errores,
            "periodo": periodo_str
        }

    def analizar_extracto(self, file_obj: Any, filename: str, tipo_cuenta: str, cuenta_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Analiza un PDF y extrae el resumen (Saldos).
        Usa configuración de BD para encontrar los extractores.
        """
        import logging
        logger = logging.getLogger("app_logger")
        
        datos = {}
        
        # 1. Intentar cargar vía DB si tenemos cuenta_id y repo
        if cuenta_id and self.cuenta_extractor_repo:
            modulos = self.cuenta_extractor_repo.obtener_modulos(cuenta_id, 'RESUMEN')
            
            if not modulos:
                 logger.warning(f"No hay extractores de RESUMEN configurados para cuenta {cuenta_id}. Intentando fallback hardcoded.")
            else:
                last_exception = None
                for nombre_modulo in modulos:
                    try:
                        logger.info(f"Intentando extractor RESUMEN: {nombre_modulo} para {filename}")
                        
                        # Reset file pointer
                        if hasattr(file_obj, 'seek'):
                            file_obj.seek(0)
                            
                        module = importlib.import_module(f"src.infrastructure.extractors.bancolombia.{nombre_modulo}")
                        datos = module.extraer_resumen(file_obj)
                        
                        if datos:
                            logger.info(f"Extractor {nombre_modulo} exitoso.")
                            break
                    except Exception as e:
                        logger.warning(f"Extractor {nombre_modulo} falló: {e}")
                        last_exception = e
                        continue
                
                if datos:
                    # Encontrado! Pasar al conteo de movimientos
                    pass
                elif last_exception:
                    # Si probamos módulos y fallaron todos, lanzamos el último error
                    # OJO: Solo si NO hay datos, si datos está vacio.
                    raise last_exception # Re-raise the last exception if no data was extracted
        
        # 2. Fallback Hardcoded (Si no funcionó DB o no había config)
        if not datos:
            # Mantener lógica anterior como fallback O lanzar error si queremos forzar uso de DB
            # Para este refactor, MANTENEMOS la lógica anterior dentro de un bloque else o si datos sigue vacio
            # ... (Lógica original de if/else tipo_cuenta) ...
            if tipo_cuenta == 'Ahorros':
                from src.infrastructure.extractors.bancolombia import ahorros_extracto
                datos = ahorros_extracto.extraer_resumen(file_obj)
            elif tipo_cuenta == 'FondoRenta':
                logger.error(f"DEBUG: SERVICE Calling extraer_resumen_fondorenta for {filename}")
                
                try:
                    from src.infrastructure.extractors.bancolombia import fondorenta_extracto
                    datos = fondorenta_extracto.extraer_resumen(file_obj)
                    logger.error(f"DEBUG: SERVICE Returned from extractor. Data keys: {list(datos.keys()) if datos else 'None'}")
                except Exception as e:
                    logger.error(f"DEBUG: Error calling fondorenta: {e}")
                    import traceback
                    logger.error(traceback.format_exc())
                    raise e
            elif tipo_cuenta == 'MasterCardPesos':
                 # ... Lógica de retry nuevo/antiguo hardcoded ...
                 # Se puede simplificar si confiamos en la DB
                 try:
                    from src.infrastructure.extractors.bancolombia import mastercard_pesos_extracto
                    datos = mastercard_pesos_extracto.extraer_resumen(file_obj)
                 except:
                    try:
                        if hasattr(file_obj, 'seek'): file_obj.seek(0)
                        from src.infrastructure.extractors.bancolombia import mastercard_pesos_extracto_anterior
                        datos = mastercard_pesos_extracto_anterior.extraer_resumen(file_obj)
                    except Exception as e:
                        raise ValueError(f"No se pudo extraer resumen MC Pesos: {e}")

            elif tipo_cuenta == 'MasterCardUSD':
                  try:
                    from src.infrastructure.extractors.bancolombia import mastercard_usd_extracto
                    datos = mastercard_usd_extracto.extraer_resumen(file_obj)
                  except:
                    try:
                        if hasattr(file_obj, 'seek'): file_obj.seek(0)
                        from src.infrastructure.extractors.bancolombia import mastercard_usd_extracto_anterior
                        datos = mastercard_usd_extracto_anterior.extraer_resumen(file_obj)
                    except Exception as e:
                         raise ValueError(f"No se pudo extraer resumen MC USD: {e}")
            else:
                raise ValueError(f"Extracción de resumen no soportada para: {tipo_cuenta}")
        
        if not datos:
            raise ValueError("No se pudo extraer el resumen del archivo. Verifique el formato.")
            
        # Intentar contar movimientos y verificar duplicados
        if cuenta_id:
            try:
                extractores = self._obtener_modulos_extractor_movimientos(cuenta_id)
                
                movs = []
                # Probar cada extractor hasta que uno funcione
                for extractor_module in extractores:
                    try:
                        # Resetear archivo
                        if hasattr(file_obj, 'seek'):
                            file_obj.seek(0)
                            
                        movs_temp = extractor_module.extraer_movimientos(file_obj)
                        if movs_temp:
                            movs = movs_temp
                            logger.info(f"Extractor {extractor_module} obtuvo {len(movs)} movimientos.")
                            break
                    except Exception as inner_e:
                        logger.warning(f"Fallo extractor individual en analisis: {inner_e}")
                        continue
                
                # Calcular estadísticas de duplicados
                total_leidos = len(movs)
                total_duplicados = 0
                total_nuevos = 0
                
                for raw in movs:
                    try:
                        # Lógica idéntica a procesar_archivo para verificar duplicados
                        es_usd = raw.get('moneda') == 'USD'
                        
                        if es_usd:
                            usd_val = raw['valor']
                            valor_para_check = 0
                        else:
                            usd_val = None
                            valor_para_check = raw['valor']
                        
                        # VERIFICAR DUPLICADOS EN LA TABLA DE EXTRACTOS (si ya se cargó este extracto)
                        if self.movimiento_extracto_repo:
                            existe = self.movimiento_extracto_repo.existe_movimiento(
                                fecha=raw['fecha'],
                                valor=valor_para_check,
                                referencia=raw.get('referencia', ''),
                                descripcion=raw['descripcion'],
                                usd=usd_val
                            )
                        else:
                             # Fallback si no hay repo de extractos (aunque debería haber)
                             existe = False
                            
                        # Lógica especial para TC (copiada de procesar_archivo)
                        # Nota: Si ya se cargó, la lógica de TC aplica igual.
                        if not existe and tipo_cuenta in ['MasterCardPesos', 'MasterCardUSD'] and self.movimiento_extracto_repo:
                            existe = self.movimiento_extracto_repo.existe_movimiento(
                                fecha=raw['fecha'],
                                valor=valor_para_check,
                                referencia=raw.get('referencia', ''),
                                descripcion='',
                                usd=usd_val
                            )
                            
                        if existe:
                            total_duplicados += 1
                        else:
                            total_nuevos += 1
                            
                    except Exception as e_check:
                        logger.warning(f"Error verificando duplicado en analisis: {e_check}")
                        # Asumimos nuevo si falla check? O lo ignoramos? Mejor asumir nuevo warning
                        total_nuevos += 1

                datos['movimientos_count'] = total_leidos # Mantener compatibilidad
                datos['total_leidos'] = total_leidos
                datos['total_duplicados'] = total_duplicados
                datos['total_nuevos'] = total_nuevos
                
                logger.info(f"Analisis preliminar: {total_leidos} leídos, {total_duplicados} duplicados, {total_nuevos} nuevos.")

            except Exception as e:
                logger.warning(f"No se pudieron contar los movimientos en analisis: {e}")
                datos['movimientos_count'] = 0
                datos['total_leidos'] = 0
                datos['total_duplicados'] = 0
                datos['total_nuevos'] = 0
                
        return datos

            
    def _obtener_modulos_extractor_movimientos(self, cuenta_id: int) -> List[Any]:
        """Retorna LISTA de módulos extractores de movimientos configurados (carga dinámica)"""
        modulos_names = []
        
        if self.cuenta_extractor_repo:
            db_modulos = self.cuenta_extractor_repo.obtener_modulos(cuenta_id, 'MOVIMIENTOS')
            if db_modulos:
                modulos_names = db_modulos

        # Si no hay en DB usemos fallback hardcoded
        if not modulos_names:
            EXTRACTORES_MOVIMIENTOS = {
                1: ['ahorros_movimientos'],
                3: ['fondorenta_movimientos'],
                6: ['mastercard_pesos_extracto_movimientos', 'mastercard_pesos_extracto_anterior_movimientos'],
                7: ['mastercard_usd_extracto_movimientos']
            }
            modulos_names = EXTRACTORES_MOVIMIENTOS.get(cuenta_id, [])

        loaded_modules = []
        import importlib
        for nombre in modulos_names:
            try:
                module = importlib.import_module(f"src.infrastructure.extractors.bancolombia.{nombre}")
                loaded_modules.append(module)
            except Exception as e:
                print(f"Error importando extractor {nombre}: {e}")
        
        return loaded_modules

    async def procesar_extracto(self, file_obj: Any, filename: str, tipo_cuenta: str, cuenta_id: int, year: Optional[int] = None, month: Optional[int] = None) -> Dict[str, Any]:
        """
        Procesa un extracto PDF y guarda resumen + movimientos
        """
        import logging
        logger = logging.getLogger("app_logger")

        # 1. Extraer resumen (Saldos)
        resumen = self.analizar_extracto(file_obj, filename, tipo_cuenta, cuenta_id)
        
        # 2. Validar o ajustar datos si es necesario
        if not year or not month:
            year_extracto = resumen.get('year')
            month_extracto = resumen.get('month')
            
            if year_extracto and month_extracto:
                year = year_extracto
                month = month_extracto
            else:
                raise ValueError("No se pudo determinar el periodo (Año/Mes) del extracto. Por favor verifique el PDF o ingréselo manualmente si la opción existe.")
        
        # Actualizar resumen con lo validado
        resumen['year'] = year
        resumen['month'] = month

        # 3. Guardar Conciliacion (Resumen)
        if not self.conciliacion_repo:
            raise Exception("ConciliacionRepository no inyectado")

        conciliacion_actual = self.conciliacion_repo.obtener_por_periodo(cuenta_id, year, month)
        
        import calendar
        last_day = calendar.monthrange(year, month)[1]
        fecha_corte = date(year, month, last_day)

        if conciliacion_actual:
            conciliacion_actual.extracto_saldo_anterior = resumen.get('saldo_anterior', Decimal(0))
            conciliacion_actual.extracto_entradas = resumen.get('entradas', Decimal(0))
            conciliacion_actual.extracto_salidas = resumen.get('salidas', Decimal(0))
            conciliacion_actual.extracto_saldo_final = resumen.get('saldo_final', Decimal(0))
            conciliacion_actual.fecha_corte = fecha_corte
            conciliacion_to_save = conciliacion_actual
        else:
            conciliacion_to_save = Conciliacion(
                id=None,
                cuenta_id=cuenta_id,
                year=year,
                month=month,
                fecha_corte=fecha_corte,
                extracto_saldo_anterior=resumen.get('saldo_anterior', Decimal(0)),
                extracto_entradas=resumen.get('entradas', Decimal(0)),
                extracto_salidas=resumen.get('salidas', Decimal(0)),
                extracto_saldo_final=resumen.get('saldo_final', Decimal(0)),
                sistema_entradas=Decimal(0),
                sistema_salidas=Decimal(0),
                sistema_saldo_final=Decimal(0),
                diferencia_saldo=None,
                datos_extra={"archivo_extracto": filename},
                estado='PENDIENTE'
            )
            
        guardado = self.conciliacion_repo.guardar(conciliacion_to_save)

        # NUEVO: Extraer y guardar movimientos del extracto
        movimientos_extracto = []
        try:
            # Determinar módulo de extractor de movimientos según cuenta
            # Determinar módulos de extractor de movimientos
            extractores = self._obtener_modulos_extractor_movimientos(cuenta_id)
            
            movimientos_data = []
            
            if extractores:
                logger.info(f"Intentando extraer movimientos con {len(extractores)} módulos para cuenta {cuenta_id}")
                
                for extractor_module in extractores:
                    try:
                        # El file_obj debe resetearse 
                        if hasattr(file_obj, 'seek'):
                            file_obj.seek(0)
                            
                        extracted = extractor_module.extraer_movimientos(file_obj)
                        if extracted:
                            movimientos_data = extracted
                            logger.info(f"Se extrajeron {len(movimientos_data)} movimientos con un módulo exitoso")
                            break
                    except Exception as e:
                        logger.warning(f"Fallo extractor en procesar_extracto: {e}")
                        continue
                
                logger.info(f"Total final movimientos extraídos del PDF: {len(movimientos_data)}")
                
                # Crear objetos MovimientoExtracto
                for mov_data in movimientos_data:
                    movimientos_extracto.append(MovimientoExtracto(
                        id=None,
                        cuenta_id=cuenta_id,
                        year=resumen['year'],
                        month=resumen['month'],
                        fecha=mov_data['fecha'],
                        descripcion=mov_data['descripcion'],
                        referencia=mov_data.get('referencia'),
                        valor=mov_data['valor'],
                        usd=mov_data.get('usd'),
                        trm=mov_data.get('trm'),
                        numero_linea=mov_data.get('numero_linea'),
                        raw_text=mov_data.get('raw_text')
                    ))
                
                if self.movimiento_extracto_repo:
                    # Eliminar movimientos anteriores del mismo periodo (si existen)
                    eliminados = self.movimiento_extracto_repo.eliminar_por_periodo(
                        cuenta_id, resumen['year'], resumen['month']
                    )
                    if eliminados > 0:
                        logger.info(f"Eliminados {eliminados} movimientos anteriores del periodo")
                    
                    # Guardar nuevos movimientos
                    count = self.movimiento_extracto_repo.guardar_lote(movimientos_extracto)
                    logger.info(f"Guardados {count} movimientos de extracto en BD")
                else:
                    logger.warning("MovimientoExtractoRepository no inyectado. No se guardaron movimientos de extracto.")

            else:
                logger.warning(f"No existe extractor de movimientos para cuenta {cuenta_id}")
                
        except Exception as e:
            logger.error(f"Error extrayendo movimientos del extracto: {e}", exc_info=True)
            # No fallar todo el proceso si falla extracción de movimientos
        
        # Opcional: Recalcular sistema para tener la foto completa
        try:
            final = self.conciliacion_repo.recalcular_sistema(cuenta_id, year, month)
        except Exception as e:
            logger.error(f"Error recalculando sistema tras carga de extracto: {e}")
            # Si falla, usamos lo que guardamos del extracto, pero marcamos que el sistema no se actualizó
            final = conciliacion_to_save
        
        return {
            "mensaje": "Extracto cargado correctamente",
            "conciliacion": final,
            'resumen': resumen,
            'movimientos_count': len(movimientos_extracto)
        }
