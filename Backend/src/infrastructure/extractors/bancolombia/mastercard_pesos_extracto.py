"""
Extractor de resumen mensual para Tarjeta de Crédito MasterCard Bancolombia (Pesos).
Lee PDFs de extracto bancario mensual.
"""

import pdfplumber
import re
from typing import Dict, Any, Optional
from decimal import Decimal
import logging

# Configurar logger
logger = logging.getLogger("app_logger")


def extraer_resumen(file_obj: Any) -> Dict[str, Any]:
    """
    Extrae el resumen del periodo de un extracto MasterCard Pesos.
    Retorna: {
        'saldo_anterior': Decimal,
        'entradas': Decimal,  # Pagos/abonos
        'salidas': Decimal,   # Compras + Intereses + Avances + Otros cargos
        'saldo_final': Decimal,
        'year': int,
        'month': int,
        'periodo_texto': str
    }
    """
    resumen = {}
    
    logger.info("=" * 80)
    logger.info("MASTERCARD PESOS - Iniciando extracción de resumen")
    logger.info("=" * 80)
    
    try:
        with pdfplumber.open(file_obj) as pdf:
            logger.info(f"Total de páginas en el PDF: {len(pdf.pages)}")
            
            # IMPORTANTE: Este PDF puede contener AMBAS secciones (DOLARES y PESOS)
            # Debemos procesar TODAS las páginas y buscar específicamente la sección de PESOS
            # NO debemos detenernos en la primera sección que encontremos
            
            for page_num, page in enumerate(pdf.pages, 1):
                logger.info(f"\\n--- Procesando página {page_num} ---")
                texto = page.extract_text()
                
                if texto:
                    logger.info(f"Texto extraído de página {page_num} (primeros 500 caracteres):")
                    logger.info(texto[:500])
                    logger.info(f"\\n... (total {len(texto)} caracteres)")
                    
                    # Guardar el texto completo en un archivo para inspección
                    try:
                        mode = "a" if page_num > 1 else "w"  # Append para páginas 2+
                        with open("debug_mastercard_pesos_text.txt", mode, encoding="utf-8") as debug_file:
                            debug_file.write(f"=== PÁGINA {page_num} ===\\n")
                            debug_file.write(texto)
                            debug_file.write("\\n\\n")
                        logger.info(f"Texto de página {page_num} guardado en: debug_mastercard_pesos_text.txt")
                    except Exception as debug_e:
                        logger.warning(f"No se pudo guardar archivo debug: {debug_e}")
                    
                    datos = _extraer_resumen_desde_texto(texto)
                    
                    if datos:
                        logger.info(f"Datos extraídos de página {page_num}: {list(datos.keys())}")
                        resumen.update(datos)
                        # Si ya tenemos saldo final de PESOS, podemos detenernos
                        if 'saldo_final' in resumen:
                            logger.info("✓ Resumen PESOS completo encontrado (saldo_final presente)")
                            break
                    else:
                        logger.warning(f"No se extrajeron datos de página {page_num} (puede ser sección DOLARES)")
                else:
                    logger.warning(f"Página {page_num} no contiene texto extraíble")
                            
    except Exception as e:
        logger.error(f"Error al leer resumen del PDF MasterCard Pesos: {e}", exc_info=True)
         # Instead of raising, we will return a partially filled or default summary
        logger.warning(f"Se retornará un resumen parcial o con valores por defecto debido al error: {e}")
    
    logger.info(f"\nResumen final extraído: {list(resumen.keys())}")
    
    # STRICT LOGIC: If we didn't confirm it's PESOS or we have no data, return empty
    # to allow fallback to the older extractor.
    if not resumen or 'saldo_final' not in resumen:
        logger.warning("No se extrajo el resumen completo de PESOS. No se aplicarán valores por defecto para permitir fallback.")
        return resumen
    
    # Ensure default keys exist IF we are sure this is the right format but some fields are missing
    defaults = {
        'saldo_anterior': Decimal(0),
        'entradas': Decimal(0),
        'salidas': Decimal(0),
        'saldo_final': Decimal(0),
        'year': 2024,
        'month': 1,
        'periodo_texto': "PERIODO DESCONOCIDO"
    }
    
    for key, default_val in defaults.items():
        if key not in resumen:
            resumen[key] = default_val
            
    logger.info("=" * 80)
    logger.info("MASTERCARD PESOS - Extracción completada (puede ser parcial)")
    logger.info("=" * 80)
    
    return resumen


def _extraer_resumen_desde_texto(texto: str) -> Optional[Dict[str, Any]]:
    """Extrae campos del resumen desde el texto del PDF."""
    # Normalizamos el texto para facilitar búsquedas
    texto_norm = texto.replace('\n', ' ').strip()
    
    logger.info("\\n--- Iniciando parsing del texto ---")
    logger.info(f"Longitud del texto normalizado: {len(texto_norm)}")
    
    data = {}
    
    # Verificar que sea la sección de PESOS
    # El PDF puede tener caracteres "triplicados" como: MMMooonnneeedddaaa::: PPPEEESSSOOOSSS
    
    # PRIMERO: Verificar que NO sea DOLARES (prioridad)
    tiene_dolares_1 = 'Moneda DOLARES' in texto
    tiene_dolares_2 = 'ESTADO DE CUENTA EN: DOLARES' in texto
    tiene_dolares_3 = bool(re.search(r'D+O+L+A+R+E+S+', texto))
    tiene_dolares_4 = 'pago en dolares' in texto.lower()
    
    if tiene_dolares_1 or tiene_dolares_2 or tiene_dolares_3 or tiene_dolares_4:
        logger.warning("✗ SALTAR: Detectado DOLARES - este es un extracto USD, no PESOS")
        logger.warning(f"   - 'DOLARES' en texto: {tiene_dolares_1}")
        logger.warning(f"   - 'ESTADO DE CUENTA EN: DOLARES': {tiene_dolares_2}")
        logger.warning(f"   - Patrón DOLARES: {tiene_dolares_3}")
        logger.warning(f"   - 'pago en dolares': {tiene_dolares_4}")
        return None
    
    # SEGUNDO: Buscar indicadores de PESOS (Más estrictos)
    tiene_pesos_1 = 'Moneda en PESOS' in texto
    tiene_pesos_2 = 'ESTADO DE CUENTA EN: PESOS' in texto
    tiene_pesos_3 = bool(re.search(r'P+E+S+O+S+', texto))
    # Buscar patrón con caracteres triplicados
    tiene_pesos_4 = bool(re.search(r'P+E+S+O+S+', texto))
    # También buscar "Cupo total" que es específico de Pesos
    tiene_cupo = 'Cupo total:' in texto or 'CCCuuupppooo' in texto
    
    # REFINEMENT: Explicit exclusion of USD markers in a PESOS page
    # If the page says "Pago Total en Dólares" or "DOLARES" is a dominant header, reject it.
    if tiene_dolares_1 or tiene_dolares_2 or tiene_dolares_3:
        logger.warning("✗ SALTAR: Detectados marcadores explicitos de DOLARES en esta pagina.")
        return None

    logger.info(f"Verificación de moneda PESOS:")
    logger.info(f"  - 'Moneda en PESOS': {tiene_pesos_1}")
    logger.info(f"  - 'ESTADO DE CUENTA EN: PESOS': {tiene_pesos_2 or tiene_pesos_3}")
    logger.info(f"  - Patrón PESOS header: {tiene_pesos_4}")
    logger.info(f"  - Contiene 'Cupo total': {tiene_cupo}")
    
    # We require either an explicit header or a Pesos-only marker like "Cupo total"
    if not (tiene_pesos_1 or tiene_pesos_2 or tiene_pesos_3 or tiene_pesos_4 or tiene_cupo):
        logger.warning("No se encontró indicación FUERTE de moneda PESOS - saltando este texto")
        return None
    
    logger.info("✓ Confirmado: es un extracto en PESOS")
    
    # 1. SALDO ANTERIOR
    logger.info("\nBuscando: Saldo anterior")
    saldo_ant_match = re.search(r'Saldo anterior\s+\$?\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    if saldo_ant_match:
        valor_str = saldo_ant_match.group(1)
        data['saldo_anterior'] = _parsear_valor_formato_col(valor_str)
        logger.info(f"  ✓ Encontrado: ${valor_str} -> {data['saldo_anterior']}")
    else:
        logger.warning("  ✗ No encontrado: Saldo anterior")
    
    # 2. COMPRAS DEL MES
    logger.info("\nBuscando: Compras del mes")
    compras_match = re.search(r'Compras del mes\s+\$?\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    compras = Decimal(0)
    if compras_match:
        valor_str = compras_match.group(1)
        compras = _parsear_valor_formato_col(valor_str)
        logger.info(f"  ✓ Encontrado: ${valor_str} -> {compras}")
    else:
        logger.info("  - No encontrado: Compras del mes (puede ser 0)")
    
    # 3. INTERESES DE MORA
    int_mora_match = re.search(r'Intereses de mora\s+\$?\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    int_mora = Decimal(0)
    if int_mora_match:
        int_mora = _parsear_valor_formato_col(int_mora_match.group(1))
    
    # 4. INTERESES CORRIENTES
    int_corr_match = re.search(r'Intereses corrientes\s+\$?\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    int_corr = Decimal(0)
    if int_corr_match:
        int_corr = _parsear_valor_formato_col(int_corr_match.group(1))
    
    # 5. AVANCES
    avances_match = re.search(r'Avances\s+\$?\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    avances = Decimal(0)
    if avances_match:
        avances = _parsear_valor_formato_col(avances_match.group(1))
    
    # 6. OTROS CARGOS
    otros_match = re.search(r'Otros cargos\s+\$?\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    otros = Decimal(0)
    if otros_match:
        otros = _parsear_valor_formato_col(otros_match.group(1))
    
    # NUEVOS CAMPOS (Por defecto 0, para edición manual)
    rendimientos = Decimal(0)
    retenciones = Decimal(0)

    # TOTAL SALIDAS = Compras + Intereses + Avances + Otros cargos
    # Nota: Usuario pidió NO sumar retenciones a salidas, y NO sumar rendimientos a entradas.
    data['salidas'] = compras + int_mora + int_corr + avances + otros
    data['rendimientos'] = rendimientos
    data['retenciones'] = retenciones
    
    # 7. PAGOS/ABONOS (ENTRADAS)
    logger.info("\nBuscando: Pagos/abonos")
    # Also try with optional - sign and optional $ sign
    pagos_match = re.search(r'(-?\s*)?Pagos\s*/\s*abonos\s+\$?\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    if pagos_match:
        valor_str = pagos_match.group(2)
        data['entradas'] = _parsear_valor_formato_col(valor_str)
        logger.info(f"  ✓ Encontrado: ${valor_str} -> {data['entradas']}")
    else:
        logger.warning("  ✗ No encontrado: Pagos/abonos")
    
    # 8. PERIODO FACTURADO
    # Puede aparecer en múltiples formatos:
    # - "Periodo facturado desde: 30/07/2025 hasta: 31/08/2025" (formato nuevo)
    # - "30 nov - 30 dic. 2025" (formato antiguo)
    logger.info("\\nBuscando: Periodo facturado")
    
    # ESTRATEGIA 1: Formato con fechas dd/mm/yyyy
    periodo_match_nuevo = re.search(
        r'Periodo facturado desde:\s*(\d{1,2})/(\d{1,2})/(\d{4})\s+hasta:\s*(\d{1,2})/(\d{1,2})/(\d{4})',
        texto,
        re.IGNORECASE
    )
    
    if periodo_match_nuevo:
        logger.info(f"  ✓ Encontrado periodo (formato fecha): {periodo_match_nuevo.group(0)}")
        # Tomamos la fecha final (hasta)
        # grupos: (dia_inicio, mes_inicio, año_inicio, dia_fin, mes_fin, año_fin)
        month = int(periodo_match_nuevo.group(5))  # mes final
        year = int(periodo_match_nuevo.group(6))   # año final
        
        if year > 2000 and 1 <= month <= 12:
            data['year'] = year
            data['month'] = month
            
            # Nombres completos de meses
            meses_es = [
                "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
            ]
            mes_nombre = meses_es[month]
            data['periodo_texto'] = f"{year} - {mes_nombre}"
            logger.info(f"  ✓ Periodo extraído: {data['periodo_texto']} (año={year}, mes={month})")
        else:
            logger.warning(f"  ✗ Periodo inválido: year={year}, month={month}")
    else:
        # ESTRATEGIA 2: Formato antiguo "dd mmm - dd mmm. yyyy"
        # Buscar: "dd mmm - dd mmm. yyyy"
        periodo_match = re.search(
            r'(\d{1,2})\s+(\w{3})\s+-\s+(\d{1,2})\s+(\w{3})\.\s+(\d{4})',
            texto,
            re.IGNORECASE
        )
        
        if periodo_match:
            logger.info(f"  ✓ Encontrado periodo: {periodo_match.group(0)}")
            grupos = periodo_match.groups()
            mes_fin_str = grupos[3].lower()  # 4to grupo (mes final)
            year = int(grupos[4])  # 5to grupo (año)
            
            # Mapeo de meses en español (abreviados)
            meses = {
                'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
                'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12
            }
            month = meses.get(mes_fin_str, 0)
            
            if year > 2000 and 1 <= month <= 12:
                data['year'] = year
                data['month'] = month
                
                # Nombres completos de meses
                meses_es = [
                    "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                ]
                mes_nombre = meses_es[month]
                data['periodo_texto'] = f"{year} - {mes_nombre}"
                logger.info(f"  ✓ Periodo extraído: {data['periodo_texto']} (año={year}, mes={month})")
            else:
                logger.warning(f"  ✗ Periodo inválido: year={year}, month={month}")
        else:
            # ESTRATEGIA 3: Formato "entre dd mmm hasta dd mmm. yyyy"
            # Ejemplo: "Nuevos movimientos entre 30 nov hasta 30 dic. 2025"
            periodo_match_3 = re.search(
                r'entre\s+(\d{1,2})\s+(\w{3})\s+hasta\s+(\d{1,2})\s+(\w{3})\.?\s+(\d{4})',
                texto,
                re.IGNORECASE
            )
            
            if periodo_match_3:
                logger.info(f"  ✓ Encontrado periodo (Estrategia 3): {periodo_match_3.group(0)}")
                mes_fin_str = periodo_match_3.group(4).lower()
                year = int(periodo_match_3.group(5))
                
                meses = {
                    'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
                    'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12
                }
                month = meses.get(mes_fin_str, 0)
                
                if year > 2000 and 1 <= month <= 12:
                    data['year'] = year
                    data['month'] = month
                    
                    meses_es = [
                        "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                    ]
                    mes_nombre = meses_es[month]
                    data['periodo_texto'] = f"{year} - {mes_nombre}"
                    logger.info(f"  ✓ Periodo extraído: {data['periodo_texto']} (año={year}, mes={month})")
                else:
                    logger.warning(f"  ✗ Periodo inválido: year={year}, month={month}")
            else:
                logger.warning("  ✗ No se encontró el periodo facturado")
    
    logger.info(f"\\nSalidas totales calculadas: {data.get('salidas', 'NO CALCULADO')}")
    
    # 9. CALCULAR SALDO FINAL
    # Para tarjetas de crédito: Saldo Final = Saldo Anterior + Salidas - Entradas
    logger.info("\\nCalculando saldo final...")
    if 'saldo_anterior' in data and 'salidas' in data and 'entradas' in data:
        data['saldo_final'] = data['saldo_anterior'] + data['salidas'] - data['entradas']
        logger.info(f"  ✓ Saldo final calculado: {data['saldo_final']}")
        logger.info(f"     (Saldo anterior: {data['saldo_anterior']} + Salidas: {data['salidas']} - Entradas: {data['entradas']})")
    else:
        logger.error("  ✗ No se puede calcular saldo final - faltan campos:")
        logger.error(f"     - saldo_anterior: {'✓' if 'saldo_anterior' in data else '✗'}")
        logger.error(f"     - salidas: {'✓' if 'salidas' in data else '✗'}")
        logger.error(f"     - entradas: {'✓' if 'entradas' in data else '✗'}")
    
    # RELAXED: Return whatever we found, even if partial
    if data:
        logger.info(f"\\n✓ Parsing completado (campos: {list(data.keys())})")
        return data
    
    logger.warning("\\n✗ Parsing falló - no se encontraron datos relevantes")
    return None


def _parsear_valor_formato_col(valor_str: str) -> Decimal:
    """
    Parsea valores con formato colombiano (1.234.567,89) 
    o formatos variados eliminando símbolos de moneda.
    """
    if not valor_str:
        return Decimal(0)
    
    # Limpieza: eliminar símbolos de moneda, espacios y otros caracteres no numéricos excepto , y .
    v_limpio = re.sub(r'[^\d,.-]', '', valor_str)
    
    # Si tiene comas y puntos, el último es el decimal (Standard Bancolombia)
    if ',' in v_limpio and '.' in v_limpio:
        pos_coma = v_limpio.rfind(',')
        pos_punto = v_limpio.rfind('.')
        if pos_punto > pos_coma: # US: 1,234.56
            v_limpio = v_limpio.replace(',', '')
        else: # COL: 1.234,56
            v_limpio = v_limpio.replace('.', '').replace(',', '.')
    elif ',' in v_limpio:
        # Si solo tiene coma, asumimos decimal si hay 2 dígitos al final
        partes = v_limpio.split(',')
        if len(partes[-1]) == 2:
            v_limpio = v_limpio.replace('.', '').replace(',', '.')
        else: # Miles
            v_limpio = v_limpio.replace(',', '')
    elif '.' in v_limpio:
        # Si solo tiene punto, similar
        partes = v_limpio.split('.')
        if len(partes[-1]) == 2: # US decimal
            pass
        else: # Miles
            v_limpio = v_limpio.replace('.', '')
    
    try:
        return Decimal(v_limpio)
    except:
        logger.warning(f"Error parseando valor: {valor_str} -> {v_limpio}")
        return Decimal(0)
