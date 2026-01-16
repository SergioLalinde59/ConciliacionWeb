from datetime import date
from decimal import Decimal
from typing import List, Dict, Any, Optional
from src.domain.models.movimiento import Movimiento
from src.domain.ports.movimiento_repository import MovimientoRepository
from src.domain.ports.moneda_repository import MonedaRepository

# Importamos las implementaciones de extractores
# En una arquitectura pura, se inyectarían como dependencias o se usaría una Factory.
# Por simplicidad, importamos directamente aquí.
from src.infrastructure.extractors.bancolombia import extraer_movimientos_bancolombia
from src.infrastructure.extractors.creditcard import extraer_movimientos_credito
from src.infrastructure.extractors.fondorenta import extraer_movimientos_fondorenta, extraer_resumen_fondorenta

from src.domain.ports.tercero_repository import TerceroRepository
from src.domain.ports.conciliacion_repository import ConciliacionRepository
from src.domain.models.conciliacion import Conciliacion
from src.infrastructure.extractors.bancolombia import extraer_resumen_bancolombia

class ProcesadorArchivosService:
    def __init__(self, 
                 movimiento_repo: MovimientoRepository, 
                 moneda_repo: MonedaRepository,
                 tercero_repo: TerceroRepository,
                 conciliacion_repo: Optional[ConciliacionRepository] = None):
        self.movimiento_repo = movimiento_repo
        self.moneda_repo = moneda_repo
        self.tercero_repo = tercero_repo
        self.conciliacion_repo = conciliacion_repo
        
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
            tipo_cuenta: 'bancolombia', 'credit_card', 'fondo_renta'
            cuenta_id: ID de la cuenta a la que asociar los movimientos
            
        Returns:
            Resumen del proceso (insertados, duplicados, errores)
        """
        
    def _extraer_movimientos(self, file_obj: Any, tipo_cuenta: str) -> List[Dict[str, Any]]:
        raw_movs = []
        if tipo_cuenta == 'bancolombia_ahorro':
            raw_movs = extraer_movimientos_bancolombia(file_obj)
        elif tipo_cuenta == 'credit_card':
            raw_movs = extraer_movimientos_credito(file_obj)
        elif tipo_cuenta == 'fondo_renta':
            raw_movs = extraer_movimientos_fondorenta(file_obj)
        else:
            raise ValueError(f"Tipo de cuenta no soportado: {tipo_cuenta}")
            
        # Normalizar descripción: "Título De Caso"
        for m in raw_movs:
            if m.get('descripcion'):
                m['descripcion'] = m['descripcion'].strip().title()
        
        return raw_movs

    def analizar_archivo(self, file_obj: Any, filename: str, tipo_cuenta: str) -> Dict[str, Any]:
        """
        Analiza el archivo sin guardar nada en BD.
        Retorna estadísticas y lista completa con marcado de duplicados.
        """
        raw_movs = self._extraer_movimientos(file_obj, tipo_cuenta)
        
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
                
                if not es_duplicado and tipo_cuenta == 'credit_card':
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
        raw_movs = self._extraer_movimientos(file_obj, tipo_cuenta)

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
                if not existe and tipo_cuenta == 'credit_card':
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
                
        return {
            "archivo": filename,
            "total_extraidos": total,
            "nuevos_insertados": insertados,
            "duplicados": duplicados,
            "errores": errores
        }

    def analizar_extracto(self, file_obj: Any, filename: str, tipo_cuenta: str) -> Dict[str, Any]:
        """
        Analiza un PDF y extrae el resumen (Saldos) sin guardar.
        """
        datos = {}
        if tipo_cuenta == 'bancolombia_ahorro':
            datos = extraer_resumen_bancolombia(file_obj)
        elif tipo_cuenta == 'FondoRenta':  # Value from frontend
            import logging
            logger = logging.getLogger("app_logger")
            logger.error(f"DEBUG: SERVICE Calling extraer_resumen_fondorenta for {filename} - vReloadCheck")
            
            # FORCE RELOAD to ensure we get the debug prints
            try:
                import importlib
                from src.infrastructure.extractors import fondorenta
                importlib.reload(fondorenta)
                logger.error("DEBUG: Force reloaded fondorenta module")
                datos = fondorenta.extraer_resumen_fondorenta(file_obj)
                logger.error(f"DEBUG: SERVICE Returned from extractor. Data keys: {list(datos.keys()) if datos else 'None'}")
            except Exception as e:
                logger.error(f"DEBUG: Error reloading/calling fondorenta: {e}")
                # Log traceback
                import traceback
                logger.error(traceback.format_exc())
                raise e
        else:
            raise ValueError(f"Extracción de resumen no soportada para: {tipo_cuenta}")
            
        if not datos:
            raise ValueError("No se pudo extraer el resumen del archivo. Verifique el formato.")
            
        return datos

    def procesar_extracto(self, file_obj: Any, filename: str, tipo_cuenta: str, cuenta_id: int, year: Optional[int] = None, month: Optional[int] = None) -> Dict[str, Any]:
        """
        Procesa un extracto y actualiza la conciliación.
        """
        # 1. Extraer
        datos = self.analizar_extracto(file_obj, filename, tipo_cuenta)
        
        # 2. Validar o ajustar datos si es necesario
        # Por seguridad, si el usuario envió year/month, usamos esos, pero podríamos validar contra el PDF si extrajimos fechas
        
        if not year or not month:
            # Intentar usar los del extracto
            year_extracto = datos.get('year')
            month_extracto = datos.get('month')
            
            if year_extracto and month_extracto:
                year = year_extracto
                month = month_extracto
            else:
                raise ValueError("No se pudo determinar el periodo (Año/Mes) del extracto. Por favor verifique el PDF o ingréselo manualmente si la opción existe.")
        
        # 3. Crear objeto Conciliacion
        # Nota: sistema_entradas/salidas se calculan o se dejan como estaban.
        # Al usar 'guardar', el repositorio hace upsert.
        
        # Buscamos si existe para preservar datos del sistema?
        # El repo maneja upsert, pero necesitamos saber si ya existe para no borrar lo del sistema
        # De hecho, el upsert SQL que tenemos solo actualiza los campos del extracto si hay conflicto
        # PERO, necesitamos pasarle valores completos o el repo debe manejar actualizaciones parciales.
        # Nuestro repo.guardar actualiza TODO.
        # Mejor estrategia: Obtener existente -> Actualizar campos extracto -> Guardar
        
        if not self.conciliacion_repo:
            raise Exception("ConciliacionRepository no inyectado")

        conciliacion_actual = self.conciliacion_repo.obtener_por_periodo(cuenta_id, year, month)
        
        # fecha_corte = date(year, month, 1) # Default si no viene
        # Intenta usar fin de mes si se puede calcular, pero por ahora dia 1 es seguro para identificar el mes
        import calendar
        last_day = calendar.monthrange(year, month)[1]
        fecha_corte = date(year, month, last_day)

        if conciliacion_actual:
            conciliacion_actual.extracto_saldo_anterior = datos.get('saldo_anterior', Decimal(0))
            conciliacion_actual.extracto_entradas = datos.get('entradas', Decimal(0))
            conciliacion_actual.extracto_salidas = datos.get('salidas', Decimal(0))
            conciliacion_actual.extracto_saldo_final = datos.get('saldo_final', Decimal(0))
            conciliacion_actual.fecha_corte = fecha_corte
            conciliacion_to_save = conciliacion_actual
        else:
            conciliacion_to_save = Conciliacion(
                id=None,
                cuenta_id=cuenta_id,
                year=year,
                month=month,
                fecha_corte=fecha_corte,
                extracto_saldo_anterior=datos.get('saldo_anterior', Decimal(0)),
                extracto_entradas=datos.get('entradas', Decimal(0)),
                extracto_salidas=datos.get('salidas', Decimal(0)),
                extracto_saldo_final=datos.get('saldo_final', Decimal(0)),
                sistema_entradas=Decimal(0),
                sistema_salidas=Decimal(0),
                sistema_saldo_final=Decimal(0),
                diferencia_saldo=None,
                datos_extra={"archivo_extracto": filename},
                estado='PENDIENTE'
            )
            
        guardado = self.conciliacion_repo.guardar(conciliacion_to_save)
        
        # Opcional: Recalcular sistema para tener la foto completa
        final = self.conciliacion_repo.recalcular_sistema(cuenta_id, year, month)
        
        return {
            "mensaje": "Extracto cargado correctamente",
            "conciliacion": final
        }
