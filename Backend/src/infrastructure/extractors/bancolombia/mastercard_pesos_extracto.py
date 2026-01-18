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
                logger.info(f"\n--- Procesando página {page_num} ---")
                texto = page.extract_text()
                
                if texto:
                    logger.info(f"Texto extraído de página {page_num} (primeros 500 caracteres):")
                    logger.info(texto[:500])
                    logger.info(f"\n... (total {len(texto)} caracteres)")
                    
                    # Guardar el texto completo en un archivo para inspección
                    try:
                        mode = "a" if page_num > 1 else "w"  # Append para páginas 2+
                        with open("debug_mastercard_pesos_text.txt", mode, encoding="utf-8") as debug_file:
                            debug_file.write(f"=== PÁGINA {page_num} ===\n")
                            debug_file.write(texto)
                            debug_file.write("\n\n")
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
        raise Exception(f"Error al leer resumen del PDF MasterCard Pesos: {e}")
    
    logger.info(f"\nResumen final extraído: {list(resumen.keys())}")
    
    if not resumen or 'saldo_final' not in resumen:
        logger.error("✗ FALLO: No se encontró saldo_final en el resumen")
        logger.error(f"Campos encontrados: {list(resumen.keys())}")
        raise Exception("No se pudo extraer el resumen del archivo. Verifique el formato.")
    
    logger.info("=" * 80)
    logger.info("MASTERCARD PESOS - Extracción completada exitosamente")
    logger.info("=" * 80)
    
    return resumen


def _extraer_resumen_desde_texto(texto: str) -> Optional[Dict[str, Any]]:
    """Extrae campos del resumen desde el texto del PDF."""
    # Normalizamos el texto para facilitar búsquedas
    texto_norm = texto.replace('\n', ' ').strip()
    
    logger.info("\n--- Iniciando parsing del texto ---")
    logger.info(f"Longitud del texto normalizado: {len(texto_norm)}")
    
    data = {}
    
    # Verificar que sea la sección de PESOS
    # El PDF puede tener caracteres "triplicados" como: MMMooonnneeedddaaa::: PPPEEESSSOOOSSS
    
    # PRIMERO: Verificar que NO sea DOLARES (prioridad)
    tiene_dolares_1 = 'DOLARES' in texto
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
    
    # SEGUNDO: Buscar indicadores de PESOS
    tiene_pesos_1 = 'Moneda: PESOS' in texto
    tiene_pesos_2 = 'ESTADO DE CUENTA EN:  PESOS' in texto
    tiene_pesos_3 = 'ESTADO DE CUENTA EN: PESOS' in texto  # Sin doble espacio
    # Buscar patrón con caracteres triplicados
    tiene_pesos_4 = bool(re.search(r'P+E+S+O+S+', texto))
    # También "Información de pago en pesos" o "pago en pesos"
    tiene_pesos_5 = 'pago en pesos' in texto.lower()
    # También buscar "Cupo" que es específico de Pesos
    tiene_cupo = 'Cupo total:' in texto or 'CCCuuupppooo' in texto
    
    logger.info(f"Verificación de moneda:")
    logger.info(f"  - 'Moneda: PESOS': {tiene_pesos_1}")
    logger.info(f"  - 'ESTADO DE CUENTA EN:  PESOS': {tiene_pesos_2}")
    logger.info(f"  - 'ESTADO DE CUENTA EN: PESOS': {tiene_pesos_3}")
    logger.info(f"  - Patrón PESOS: {tiene_pesos_4}")
    logger.info(f"  - 'pago en pesos': {tiene_pesos_5}")
    logger.info(f"  - Contiene 'Cupo total': {tiene_cupo}")
    
    
    if not (tiene_pesos_1 or tiene_pesos_2 or tiene_pesos_3 or tiene_pesos_4 or tiene_pesos_5):
        logger.warning("No se encontró indicación de moneda PESOS - saltando este texto")
        return None
    
    logger.info("✓ Confirmado: es un extracto en PESOS")
    
    # 1. SALDO ANTERIOR
    logger.info("\nBuscando: Saldo anterior")
    saldo_ant_match = re.search(r'\+?\s*Saldo anterior\s+\$?\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    if saldo_ant_match:
        valor_str = saldo_ant_match.group(1)
        data['saldo_anterior'] = _parsear_valor_formato_col(valor_str)
        logger.info(f"  ✓ Encontrado: ${valor_str} -> {data['saldo_anterior']}")
    else:
        logger.warning("  ✗ No encontrado: Saldo anterior")
    
    # 2. COMPRAS DEL MES
    logger.info("\nBuscando: Compras del mes")
    compras_match = re.search(r'\+?\s*Compras del mes\s+\$?\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    compras = Decimal(0)
    if compras_match:
        valor_str = compras_match.group(1)
        compras = _parsear_valor_formato_col(valor_str)
        logger.info(f"  ✓ Encontrado: ${valor_str} -> {compras}")
    else:
        logger.info("  - No encontrado: Compras del mes (puede ser 0)")
    
    # 3. INTERESES DE MORA
    int_mora_match = re.search(r'\+?\s*Intereses de mora\s+\$?\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    int_mora = Decimal(0)
    if int_mora_match:
        int_mora = _parsear_valor_formato_col(int_mora_match.group(1))
    
    # 4. INTERESES CORRIENTES
    int_corr_match = re.search(r'\+?\s*Intereses corrientes\s+\$?\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    int_corr = Decimal(0)
    if int_corr_match:
        int_corr = _parsear_valor_formato_col(int_corr_match.group(1))
    
    # 5. AVANCES
    avances_match = re.search(r'\+?\s*Avances\s+\$?\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    avances = Decimal(0)
    if avances_match:
        avances = _parsear_valor_formato_col(avances_match.group(1))
    
    # 6. OTROS CARGOS
    otros_match = re.search(r'\+?\s*Otros cargos\s+\$?\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    otros = Decimal(0)
    if otros_match:
        otros = _parsear_valor_formato_col(otros_match.group(1))
    
    # TOTAL SALIDAS = Compras + Intereses + Avances + Otros cargos
    data['salidas'] = compras + int_mora + int_corr + avances + otros
    
    # 7. PAGOS/ABONOS (ENTRADAS)
    logger.info("\nBuscando: Pagos/abonos")
    # Also try with optional - sign and optional $ sign
    pagos_match = re.search(r'\(-?\)?\s*Pagos\s*/\s*abonos\s+\$?\s*([\d.,]+)', texto_norm, re.IGNORECASE)
    if pagos_match:
        valor_str = pagos_match.group(1)
        data['entradas'] = _parsear_valor_formato_col(valor_str)
        logger.info(f"  ✓ Encontrado: ${valor_str} -> {data['entradas']}")
    else:
        logger.warning("  ✗ No encontrado: Pagos/abonos")
    
    # 8. PERIODO FACTURADO
    # Puede aparecer en múltiples formatos:
    # - "Periodo facturado desde: 30/07/2025 hasta: 31/08/2025" (formato nuevo)
    # - "30 nov - 30 dic. 2025" (formato antiguo)
    logger.info("\nBuscando: Periodo facturado")
    
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
    
    logger.info(f"\nSalidas totales calculadas: {data.get('salidas', 'NO CALCULADO')}")
    
    # 9. CALCULAR SALDO FINAL
    # Para tarjetas de crédito: Saldo Final = Saldo Anterior + Salidas - Entradas
    logger.info("\nCalculando saldo final...")
    if 'saldo_anterior' in data and 'salidas' in data and 'entradas' in data:
        data['saldo_final'] = data['saldo_anterior'] + data['salidas'] - data['entradas']
        logger.info(f"  ✓ Saldo final calculado: {data['saldo_final']}")
        logger.info(f"     (Saldo anterior: {data['saldo_anterior']} + Salidas: {data['salidas']} - Entradas: {data['entradas']})")
    else:
        logger.error("  ✗ No se puede calcular saldo final - faltan campos:")
        logger.error(f"     - saldo_anterior: {'✓' if 'saldo_anterior' in data else '✗'}")
        logger.error(f"     - salidas: {'✓' if 'salidas' in data else '✗'}")
        logger.error(f"     - entradas: {'✓' if 'entradas' in data else '✗'}")
    
    # Si encontramos los datos principales, retornamos
    if 'saldo_anterior' in data and 'saldo_final' in data:
        logger.info("\n✓ Parsing exitoso - retornando datos")
        return data
    
    logger.warning(f"\n✗ Parsing incompleto - campos encontrados: {list(data.keys())}")
    return None


def _parsear_valor_formato_col(valor_str: str) -> Decimal:
    """
    Parsea valores con formato colombiano (1.234.567,89)
    donde punto es miles y coma es decimal.
    """
    if not valor_str:
        return Decimal(0)
    
    # Eliminar puntos (miles)
    valor_limpio = valor_str.replace('.', '')
    # Reemplazar coma por punto (decimal)
    valor_limpio = valor_limpio.replace(',', '.')
    
    try:
        return Decimal(valor_limpio)
    except:
        return Decimal(0)
